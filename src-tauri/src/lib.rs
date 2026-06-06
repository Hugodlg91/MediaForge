use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

// ─── State ───────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    pub current_process: Arc<Mutex<Option<CommandChild>>>,
}

/// Anti-zombie: automatically kill any live FFmpeg process when the
/// application is shut down and Tauri drops the managed state.
impl Drop for AppState {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.current_process.lock() {
            if let Some(child) = guard.take() {
                let _ = child.kill();
            }
        }
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct ProgressPayload {
    percentage: f32,
    current_time: String,
    speed: String,
}

#[derive(Serialize, Deserialize)]
pub struct MediaInfo {
    pub duration: f64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub file_size: u64,
    pub bitrate: Option<String>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Parse "HH:MM:SS.ms" → total seconds.
fn time_str_to_secs(s: &str) -> Option<f64> {
    let parts: Vec<&str> = s.trim().split(':').collect();
    if parts.len() != 3 {
        return None;
    }
    let h: f64 = parts[0].parse().ok()?;
    let m: f64 = parts[1].parse().ok()?;
    let s: f64 = parts[2].parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + s)
}

/// Extract duration from an FFmpeg stderr line like:
///   "  Duration: 00:01:23.45, start: ..."
fn parse_duration_line(line: &str) -> Option<f64> {
    let start = line.find("Duration: ")?;
    let rest = &line[start + 10..];
    let end = rest.find(',').unwrap_or(rest.len());
    time_str_to_secs(&rest[..end])
}

fn format_secs(secs: f64) -> String {
    let h = (secs / 3600.0) as u64;
    let m = ((secs % 3600.0) / 60.0) as u64;
    let s = (secs % 60.0) as u64;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

/// Map a user-facing codec choice to FFmpeg `-c:v` args.
///
/// Simple names map to software encoders. Explicit encoder names
/// (e.g. "h264_nvenc", "hevc_videotoolbox") are passed through unchanged so
/// the frontend can request hardware-accelerated encoders after detection.
fn video_codec_args(codec: &str) -> Vec<String> {
    let enc = match codec {
        "h264" => "libx264",
        "h265" | "hevc" => "libx265",
        "vp9" => "libvpx-vp9",
        other => other,
    };
    vec!["-c:v".into(), enc.into()]
}

/// Hardware encoders MediaForge knows how to surface. We probe `ffmpeg -encoders`
/// and keep only the ones actually compiled into the bundled binary.
const KNOWN_HW_ENCODERS: &[&str] = &[
    "h264_nvenc",
    "hevc_nvenc",
    "av1_nvenc",
    "h264_qsv",
    "hevc_qsv",
    "vp9_qsv",
    "h264_videotoolbox",
    "hevc_videotoolbox",
    "h264_amf",
    "hevc_amf",
];

// ─── Core FFmpeg runner ───────────────────────────────────────────────────────

/// Spawn ffmpeg with the given args, stream progress events, and return the
/// output path on success.
async fn run_ffmpeg(
    app: tauri::AppHandle,
    process_slot: Arc<Mutex<Option<CommandChild>>>,
    args: Vec<String>,
    output_path: String,
) -> Result<String, String> {
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(&args)
        .spawn()
        .map_err(|e| e.to_string())?;

    {
        let mut guard = process_slot.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }

    let mut total_duration = 0.0f64;
    let mut out_time_us: Option<u64> = None;
    let mut speed = String::from("N/A");
    let mut stderr_buf = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            // stderr → contains "Duration:" at the start and human-readable progress
            CommandEvent::Stderr(bytes) => {
                stderr_buf.push_str(&String::from_utf8_lossy(&bytes));
                // FFmpeg flushes partial lines; scan for Duration once we have it
                if total_duration == 0.0 {
                    for line in stderr_buf.lines() {
                        if let Some(d) = parse_duration_line(line) {
                            total_duration = d;
                            break;
                        }
                    }
                }
            }
            // stdout → machine-readable progress via `-progress pipe:1`
            CommandEvent::Stdout(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                for part in text.split('\n') {
                    let part = part.trim();
                    if let Some(v) = part.strip_prefix("out_time_us=") {
                        out_time_us = v.parse().ok();
                    } else if let Some(v) = part.strip_prefix("speed=") {
                        speed = v.trim_end_matches('x').to_string() + "x";
                    } else if part == "progress=continue" || part == "progress=end" {
                        if let Some(us) = out_time_us {
                            let current_secs = us as f64 / 1_000_000.0;
                            let percentage = if total_duration > 0.0 {
                                ((current_secs / total_duration) * 100.0)
                                    .clamp(0.0, 100.0) as f32
                            } else {
                                0.0
                            };
                            let _ = app.emit(
                                "conversion_progress",
                                ProgressPayload {
                                    percentage,
                                    current_time: format_secs(current_secs),
                                    speed: speed.clone(),
                                },
                            );
                        }
                    }
                }
            }
            CommandEvent::Terminated(status) => {
                let mut guard = process_slot.lock().map_err(|e| e.to_string())?;
                *guard = None;

                return if status.code == Some(0) {
                    // Emit 100 % on success
                    let _ = app.emit(
                        "conversion_progress",
                        ProgressPayload {
                            percentage: 100.0,
                            current_time: String::new(),
                            speed: String::new(),
                        },
                    );
                    Ok(output_path)
                } else if status.code == Some(255) || status.code == Some(-1) {
                    // Killed by cancel_conversion
                    Err("cancelled".to_string())
                } else {
                    Err(format!(
                        "FFmpeg exited with code {:?}",
                        status.code
                    ))
                };
            }
            _ => {}
        }
    }

    Ok(output_path)
}

// ─── Commands ────────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn convert_video(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    input_path: String,
    output_path: String,
    resolution: Option<String>,
    codec: Option<String>,
    bitrate: Option<String>,
) -> Result<String, String> {
    let mut args: Vec<String> = vec![
        "-i".into(),
        input_path,
        // machine-readable progress to stdout
        "-progress".into(),
        "pipe:1".into(),
        "-nostats".into(),
    ];

    if let Some(res) = &resolution {
        // res is e.g. "1280:720" (FFmpeg uses colon, not 'x', in scale filter)
        let scale = res.replace('x', ":");
        args.extend(["-vf".into(), format!("scale={}", scale)]);
    }

    if let Some(c) = codec.as_deref() {
        if !c.is_empty() {
            args.extend(video_codec_args(c));
        }
    }

    if let Some(br) = &bitrate {
        args.extend(["-b:v".into(), br.clone()]);
    }

    // Overwrite output without asking
    args.extend(["-y".into(), output_path.clone()]);

    let slot = Arc::clone(&state.current_process);
    run_ffmpeg(app, slot, args, output_path).await
}

#[tauri::command(rename_all = "snake_case")]
async fn convert_audio(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    input_path: String,
    output_path: String,
    bitrate: Option<String>,
    sample_rate: Option<String>,
    normalize: bool,
) -> Result<String, String> {
    let mut args: Vec<String> = vec![
        "-i".into(),
        input_path,
        "-progress".into(),
        "pipe:1".into(),
        "-nostats".into(),
        "-vn".into(), // strip video stream
    ];

    if let Some(br) = &bitrate {
        args.extend(["-b:a".into(), br.clone()]);
    }

    if let Some(sr) = &sample_rate {
        args.extend(["-ar".into(), sr.clone()]);
    }

    if normalize {
        args.extend(["-af".into(), "loudnorm".into()]);
    }

    args.extend(["-y".into(), output_path.clone()]);

    let slot = Arc::clone(&state.current_process);
    run_ffmpeg(app, slot, args, output_path).await
}

#[tauri::command(rename_all = "snake_case")]
async fn cancel_conversion(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut guard = state
        .current_process
        .lock()
        .map_err(|e| e.to_string())?;
    if let Some(child) = guard.take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn get_media_info(
    app: tauri::AppHandle,
    input_path: String,
) -> Result<MediaInfo, String> {
    let file_size = std::fs::metadata(&input_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let (mut rx, _child) = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| e.to_string())?
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_streams",
            "-show_format",
            &input_path,
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    let mut stdout_data = Vec::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => stdout_data.extend(bytes),
            CommandEvent::Terminated(_) => break,
            _ => {}
        }
    }

    let v: serde_json::Value = serde_json::from_slice(&stdout_data)
        .map_err(|e| format!("ffprobe parse error: {}", e))?;

    let format = &v["format"];
    let streams = v["streams"].as_array().cloned().unwrap_or_default();

    let duration: f64 = format["duration"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    let bitrate = format["bit_rate"]
        .as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .map(|bps| format!("{} kbps", bps / 1000));

    let mut width = None;
    let mut height = None;
    let mut video_codec = None;
    let mut audio_codec = None;

    for stream in &streams {
        match stream["codec_type"].as_str().unwrap_or("") {
            "video" => {
                width = stream["width"].as_u64().map(|v| v as u32);
                height = stream["height"].as_u64().map(|v| v as u32);
                video_codec = stream["codec_name"].as_str().map(String::from);
            }
            "audio" => {
                audio_codec = stream["codec_name"].as_str().map(String::from);
            }
            _ => {}
        }
    }

    Ok(MediaInfo {
        duration,
        width,
        height,
        video_codec,
        audio_codec,
        file_size,
        bitrate,
    })
}

// ─── Image types ─────────────────────────────────────────────────────────────

/// Probe the bundled FFmpeg for available hardware video encoders.
/// Returns the subset of `KNOWN_HW_ENCODERS` that FFmpeg reports as built-in.
/// The frontend uses this to decide whether to request NVENC/QSV/VideoToolbox/AMF.
#[tauri::command(rename_all = "snake_case")]
async fn detect_hw_encoders(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let (mut rx, _child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(["-hide_banner", "-encoders"])
        .spawn()
        .map_err(|e| e.to_string())?;

    let mut out = String::new();
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => out.push_str(&String::from_utf8_lossy(&bytes)),
            CommandEvent::Stderr(bytes) => out.push_str(&String::from_utf8_lossy(&bytes)),
            CommandEvent::Terminated(_) => break,
            _ => {}
        }
    }

    let found: Vec<String> = KNOWN_HW_ENCODERS
        .iter()
        .filter(|enc| out.contains(**enc))
        .map(|s| s.to_string())
        .collect();
    Ok(found)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ResizeOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub keep_aspect_ratio: bool,
}

#[derive(Serialize, Clone)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub file_size: u64,
    pub has_alpha: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BatchImageItem {
    pub input_path: String,
    pub output_path: String,
}

#[derive(Serialize, Clone)]
pub struct BatchResult {
    pub input: String,
    pub output: String,
    pub success: bool,
    pub error: Option<String>,
}

/// Generic item for video/audio batch: input path + pre-computed output path.
#[derive(Serialize, Deserialize, Clone)]
pub struct BatchMediaItem {
    pub input_path: String,
    pub output_path: String,
}

#[derive(Serialize, Clone)]
struct BatchProgressPayload {
    index: usize,
    total: usize,
    current_file: String,
    percentage: f32,
}

#[derive(Serialize, Clone)]
struct ImageProgressPayload {
    percentage: f32,
    current_file: Option<String>,
}

// ─── Image helpers ────────────────────────────────────────────────────────────

/// Load, optionally resize, and save an image to the target format with
/// optional quality (applies to JPEG only; WebP/PNG/BMP/TIFF use defaults).
fn process_single_image(
    input_path: &str,
    output_path: &str,
    format: &str,
    quality: Option<u8>,
    resize: Option<&ResizeOptions>,
) -> Result<(), String> {
    use image::imageops::FilterType;

    let mut img = image::open(input_path)
        .map_err(|e| format!("Impossible d'ouvrir l'image : {}", e))?;

    // ── Resize ────────────────────────────────────────────────────────────────
    if let Some(r) = resize {
        let (orig_w, orig_h) = (img.width(), img.height());
        let (new_w, new_h) = match (r.width, r.height, r.keep_aspect_ratio) {
            // Both dims, no ratio constraint
            (Some(w), Some(h), false) => (w, h),
            // Both dims, keep ratio (fit inside the box)
            (Some(w), Some(h), true) => {
                let ratio = (w as f64 / orig_w as f64).min(h as f64 / orig_h as f64);
                (
                    (orig_w as f64 * ratio).round() as u32,
                    (orig_h as f64 * ratio).round() as u32,
                )
            }
            // Only width — height follows ratio
            (Some(w), None, _) => {
                let ratio = w as f64 / orig_w as f64;
                (w, (orig_h as f64 * ratio).round() as u32)
            }
            // Only height — width follows ratio
            (None, Some(h), _) => {
                let ratio = h as f64 / orig_h as f64;
                ((orig_w as f64 * ratio).round() as u32, h)
            }
            _ => (orig_w, orig_h),
        };

        if new_w != orig_w || new_h != orig_h {
            img = img.resize_exact(new_w, new_h, FilterType::Lanczos3);
        }
    }

    // ── Encode ────────────────────────────────────────────────────────────────
    let quality = quality.unwrap_or(85);

    match format.to_lowercase().as_str() {
        "jpg" | "jpeg" => {
            let file =
                std::fs::File::create(output_path).map_err(|e| e.to_string())?;
            let mut writer = std::io::BufWriter::new(file);
            let encoder =
                image::codecs::jpeg::JpegEncoder::new_with_quality(&mut writer, quality);
            img.write_with_encoder(encoder).map_err(|e| e.to_string())?;
        }
        "webp" => {
            img.save_with_format(output_path, image::ImageFormat::WebP)
                .map_err(|e| e.to_string())?;
        }
        "png" => {
            img.save_with_format(output_path, image::ImageFormat::Png)
                .map_err(|e| e.to_string())?;
        }
        "bmp" => {
            img.save_with_format(output_path, image::ImageFormat::Bmp)
                .map_err(|e| e.to_string())?;
        }
        "tiff" | "tif" => {
            img.save_with_format(output_path, image::ImageFormat::Tiff)
                .map_err(|e| e.to_string())?;
        }
        other => return Err(format!("Format non supporté : {}", other)),
    }

    Ok(())
}

// ─── Image commands ───────────────────────────────────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn convert_image(
    app: tauri::AppHandle,
    input_path: String,
    output_path: String,
    format: String,
    quality: Option<u8>,
    resize: Option<ResizeOptions>,
) -> Result<String, String> {
    let out = output_path.clone();

    tauri::async_runtime::spawn_blocking(move || {
        process_single_image(&input_path, &output_path, &format, quality, resize.as_ref())
    })
    .await
    .map_err(|e| e.to_string())??;

    let _ = app.emit(
        "image_progress",
        ImageProgressPayload {
            percentage: 100.0,
            current_file: None,
        },
    );

    Ok(out)
}

#[tauri::command(rename_all = "snake_case")]
async fn convert_images_batch(
    app: tauri::AppHandle,
    files: Vec<BatchImageItem>,
    format: String,
    quality: Option<u8>,
    resize: Option<ResizeOptions>,
) -> Result<Vec<BatchResult>, String> {
    use std::sync::atomic::{AtomicUsize, Ordering};

    let files: Vec<BatchImageItem> = files;
    let total = files.len();
    if total == 0 {
        return Ok(Vec::new());
    }

    // Image conversion is CPU-bound, so fan it out across the available cores
    // instead of processing strictly one file at a time.
    let concurrency = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .max(1);

    let completed = AtomicUsize::new(0);
    let mut results: Vec<BatchResult> = Vec::with_capacity(total);

    // Process in chunks of `concurrency`: every file in a chunk runs on its own
    // blocking thread, then we await the whole chunk before starting the next.
    for chunk in files.chunks(concurrency) {
        let mut handles = Vec::with_capacity(chunk.len());

        for item in chunk.iter().cloned() {
            let fmt = format.clone();
            let resize_clone = resize.clone();
            handles.push(tauri::async_runtime::spawn_blocking(move || {
                let res = process_single_image(
                    &item.input_path,
                    &item.output_path,
                    &fmt,
                    quality,
                    resize_clone.as_ref(),
                );
                (item, res)
            }));
        }

        for handle in handles {
            let (item, res) = handle.await.map_err(|e| e.to_string())?;

            let done = completed.fetch_add(1, Ordering::SeqCst) + 1;
            let file_name = std::path::Path::new(&item.input_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let _ = app.emit(
                "image_progress",
                ImageProgressPayload {
                    percentage: (done as f32 / total as f32) * 100.0,
                    current_file: Some(file_name),
                },
            );

            results.push(BatchResult {
                input: item.input_path,
                output: item.output_path,
                success: res.is_ok(),
                error: res.err(),
            });
        }
    }

    let _ = app.emit(
        "image_progress",
        ImageProgressPayload {
            percentage: 100.0,
            current_file: None,
        },
    );

    Ok(results)
}

#[tauri::command(rename_all = "snake_case")]
async fn get_image_info(input_path: String) -> Result<ImageInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let file_size = std::fs::metadata(&input_path)
            .map(|m| m.len())
            .unwrap_or(0);

        let reader = image::io::Reader::open(&input_path)
            .map_err(|e| format!("Impossible d'ouvrir : {}", e))?
            .with_guessed_format()
            .map_err(|e| format!("Format non reconnu : {}", e))?;

        let format_str = reader
            .format()
            .map(|f| format!("{:?}", f).to_lowercase())
            .unwrap_or_else(|| "unknown".to_string());

        let img = reader
            .decode()
            .map_err(|e| format!("Impossible de décoder : {}", e))?;

        let (width, height) = (img.width(), img.height());

        let has_alpha = matches!(
            img.color(),
            image::ColorType::Rgba8
                | image::ColorType::Rgba16
                | image::ColorType::Rgba32F
                | image::ColorType::La8
                | image::ColorType::La16
        );

        Ok::<ImageInfo, String>(ImageInfo {
            width,
            height,
            format: format_str,
            file_size,
            has_alpha,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ─── Video batch ─────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn convert_video_batch(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    files: Vec<BatchMediaItem>,
    resolution: Option<String>,
    codec: Option<String>,
    bitrate: Option<String>,
) -> Result<Vec<BatchResult>, String> {
    let total = files.len();
    let mut results: Vec<BatchResult> = Vec::with_capacity(total);

    for (i, item) in files.into_iter().enumerate() {
        let file_name = std::path::Path::new(&item.input_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let _ = app.emit(
            "batch_progress",
            BatchProgressPayload {
                index: i,
                total,
                current_file: file_name.clone(),
                percentage: (i as f32 / total as f32) * 100.0,
            },
        );

        let mut args: Vec<String> = vec![
            "-i".into(),
            item.input_path.clone(),
            "-progress".into(),
            "pipe:1".into(),
            "-nostats".into(),
        ];

        if let Some(res) = &resolution {
            let scale = res.replace('x', ":");
            args.extend(["-vf".into(), format!("scale={}", scale)]);
        }

        if let Some(c) = codec.as_deref() {
            if !c.is_empty() {
                args.extend(video_codec_args(c));
            }
        }

        if let Some(br) = &bitrate {
            args.extend(["-b:v".into(), br.clone()]);
        }

        args.extend(["-y".into(), item.output_path.clone()]);

        let slot = Arc::clone(&state.current_process);
        let result = run_ffmpeg(app.clone(), slot, args, item.output_path.clone()).await;

        let cancelled = matches!(result, Err(ref e) if e == "cancelled");
        results.push(BatchResult {
            input: item.input_path,
            output: item.output_path,
            success: result.is_ok(),
            error: result.err(),
        });

        if cancelled {
            return Err("cancelled".to_string());
        }
    }

    let _ = app.emit(
        "batch_progress",
        BatchProgressPayload {
            index: total,
            total,
            current_file: String::new(),
            percentage: 100.0,
        },
    );

    Ok(results)
}

// ─── Audio batch ──────────────────────────────────────────────────────────────

#[tauri::command(rename_all = "snake_case")]
async fn convert_audio_batch(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    files: Vec<BatchMediaItem>,
    bitrate: Option<String>,
    sample_rate: Option<String>,
    normalize: bool,
) -> Result<Vec<BatchResult>, String> {
    let total = files.len();
    let mut results: Vec<BatchResult> = Vec::with_capacity(total);

    for (i, item) in files.into_iter().enumerate() {
        let file_name = std::path::Path::new(&item.input_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let _ = app.emit(
            "batch_progress",
            BatchProgressPayload {
                index: i,
                total,
                current_file: file_name.clone(),
                percentage: (i as f32 / total as f32) * 100.0,
            },
        );

        let mut args: Vec<String> = vec![
            "-i".into(),
            item.input_path.clone(),
            "-progress".into(),
            "pipe:1".into(),
            "-nostats".into(),
            "-vn".into(),
        ];

        if let Some(br) = &bitrate {
            args.extend(["-b:a".into(), br.clone()]);
        }

        if let Some(sr) = &sample_rate {
            args.extend(["-ar".into(), sr.clone()]);
        }

        if normalize {
            args.extend(["-af".into(), "loudnorm".into()]);
        }

        args.extend(["-y".into(), item.output_path.clone()]);

        let slot = Arc::clone(&state.current_process);
        let result = run_ffmpeg(app.clone(), slot, args, item.output_path.clone()).await;

        let cancelled = matches!(result, Err(ref e) if e == "cancelled");
        results.push(BatchResult {
            input: item.input_path,
            output: item.output_path,
            success: result.is_ok(),
            error: result.err(),
        });

        if cancelled {
            return Err("cancelled".to_string());
        }
    }

    let _ = app.emit(
        "batch_progress",
        BatchProgressPayload {
            index: total,
            total,
            current_file: String::new(),
            percentage: 100.0,
        },
    );

    Ok(results)
}

// ─── Settings ────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    pub language: String,
    pub theme: String,
    pub output_dir: Option<String>,
    pub default_video_format: String,
    pub default_audio_format: String,
    pub default_image_format: String,
    /// Suffix appended to output file names (e.g. "_converted").
    pub filename_suffix: String,
    /// What to do when the output file already exists: "rename" | "overwrite".
    pub conflict_strategy: String,
    /// Hardware acceleration preference for video: "auto" | "hardware" | "software".
    pub hw_acceleration: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "en".to_string(),
            theme: "dark".to_string(),
            output_dir: None,
            default_video_format: "mp4".to_string(),
            default_audio_format: "mp3".to_string(),
            default_image_format: "webp".to_string(),
            filename_suffix: "_converted".to_string(),
            conflict_strategy: "rename".to_string(),
            hw_acceleration: "auto".to_string(),
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    let d = Settings::default();
    let language = store.get("language")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.language);
    let theme = store.get("theme")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.theme);
    let output_dir = store.get("output_dir")
        .and_then(|v| if v.is_null() { None } else { v.as_str().map(String::from) });
    let default_video_format = store.get("default_video_format")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.default_video_format);
    let default_audio_format = store.get("default_audio_format")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.default_audio_format);
    let default_image_format = store.get("default_image_format")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.default_image_format);
    let filename_suffix = store.get("filename_suffix")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.filename_suffix);
    let conflict_strategy = store.get("conflict_strategy")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.conflict_strategy);
    let hw_acceleration = store.get("hw_acceleration")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or(d.hw_acceleration);
    Ok(Settings {
        language,
        theme,
        output_dir,
        default_video_format,
        default_audio_format,
        default_image_format,
        filename_suffix,
        conflict_strategy,
        hw_acceleration,
    })
}

#[tauri::command(rename_all = "snake_case")]
async fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("language", serde_json::json!(settings.language));
    store.set("theme", serde_json::json!(settings.theme));
    store.set("output_dir", serde_json::json!(settings.output_dir));
    store.set("default_video_format", serde_json::json!(settings.default_video_format));
    store.set("default_audio_format", serde_json::json!(settings.default_audio_format));
    store.set("default_image_format", serde_json::json!(settings.default_image_format));
    store.set("filename_suffix", serde_json::json!(settings.filename_suffix));
    store.set("conflict_strategy", serde_json::json!(settings.conflict_strategy));
    store.set("hw_acceleration", serde_json::json!(settings.hw_acceleration));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Output path helpers ───────────────────────────────────────────────────────

/// Return a non-conflicting output path. If `path` does not exist it is returned
/// unchanged; otherwise " (1)", " (2)", ... is inserted before the extension until
/// a free name is found.
#[tauri::command(rename_all = "snake_case")]
async fn unique_output_path(path: String) -> Result<String, String> {
    use std::path::Path;
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(path);
    }
    let parent = p.parent().map(|x| x.to_path_buf()).unwrap_or_default();
    let stem = p
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = p.extension().map(|s| s.to_string_lossy().to_string());

    for n in 1..100_000u32 {
        let candidate_name = match &ext {
            Some(e) => format!("{} ({}).{}", stem, n, e),
            None => format!("{} ({})", stem, n),
        };
        let candidate = parent.join(candidate_name);
        if !candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }
    Err("Trop de fichiers en conflit".to_string())
}

// ─── Presets ───────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub media_type: String, // "image" | "video" | "audio"
    pub settings: serde_json::Value,
}

const PRESETS_KEY: &str = "items";

#[tauri::command(rename_all = "snake_case")]
async fn get_presets(app: tauri::AppHandle) -> Result<Vec<Preset>, String> {
    let store = app.store("presets.json").map_err(|e| e.to_string())?;
    let items: Vec<Preset> = store
        .get(PRESETS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    Ok(items)
}

#[tauri::command(rename_all = "snake_case")]
async fn save_preset(app: tauri::AppHandle, preset: Preset) -> Result<(), String> {
    let store = app.store("presets.json").map_err(|e| e.to_string())?;
    let mut items: Vec<Preset> = store
        .get(PRESETS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    if let Some(existing) = items.iter_mut().find(|p| p.id == preset.id) {
        *existing = preset;
    } else {
        items.push(preset);
    }
    store.set(PRESETS_KEY, serde_json::to_value(&items).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn delete_preset(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let store = app.store("presets.json").map_err(|e| e.to_string())?;
    let mut items: Vec<Preset> = store
        .get(PRESETS_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    items.retain(|p| p.id != id);
    store.set(PRESETS_KEY, serde_json::to_value(&items).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Folder opener ───────────────────────────────────────────────────────────

/// Open the parent folder of the given file path in the native file manager.
#[tauri::command(rename_all = "snake_case")]
async fn open_folder(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let path = std::path::Path::new(&file_path);
    let folder = path.parent().unwrap_or(path);
    app.opener()
        .open_path(folder.to_string_lossy().as_ref(), None::<&str>)
        .map_err(|e| e.to_string())
}

// ─── History ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub file_name: String,
    pub media_type: String, // "image" | "video" | "audio"
    pub source_format: String,
    pub target_format: String,
    pub output_path: String,
    pub timestamp: u64,
    pub status: String, // "success" | "error"
    pub file_size: Option<String>,
}

const HISTORY_KEY: &str = "items";
const HISTORY_MAX: usize = 50;

#[tauri::command(rename_all = "snake_case")]
async fn get_history(app: tauri::AppHandle) -> Result<Vec<HistoryItem>, String> {
    let store = app.store("history.json").map_err(|e| e.to_string())?;
    let items: Vec<HistoryItem> = store
        .get(HISTORY_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    // Already stored newest-first, but re-sort for safety
    let mut items = items;
    items.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(items)
}

#[tauri::command(rename_all = "snake_case")]
async fn add_history_item(app: tauri::AppHandle, item: HistoryItem) -> Result<(), String> {
    let store = app.store("history.json").map_err(|e| e.to_string())?;
    let mut items: Vec<HistoryItem> = store
        .get(HISTORY_KEY)
        .and_then(|v| serde_json::from_value(v).ok())
        .unwrap_or_default();
    items.insert(0, item);
    items.truncate(HISTORY_MAX);
    store.set(HISTORY_KEY, serde_json::to_value(&items).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn clear_history(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("history.json").map_err(|e| e.to_string())?;
    store.set(HISTORY_KEY, serde_json::json!([]));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn open_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())
}

// ─── App entry ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            current_process: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            convert_video,
            convert_audio,
            cancel_conversion,
            get_media_info,
            convert_image,
            convert_images_batch,
            get_image_info,
            convert_video_batch,
            convert_audio_batch,
            detect_hw_encoders,
            unique_output_path,
            open_folder,
            get_settings,
            save_settings,
            get_presets,
            save_preset,
            delete_preset,
            get_history,
            add_history_item,
            clear_history,
            open_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── time_str_to_secs ──────────────────────────────────────────────────────

    #[test]
    fn test_time_str_to_secs_basic() {
        assert_eq!(time_str_to_secs("00:00:00.00"), Some(0.0));
        assert_eq!(time_str_to_secs("00:01:00.00"), Some(60.0));
        assert_eq!(time_str_to_secs("01:00:00.00"), Some(3600.0));
    }

    #[test]
    fn test_time_str_to_secs_mixed() {
        // 1h 2m 3.5s = 3723.5s
        let result = time_str_to_secs("01:02:03.5").unwrap();
        assert!((result - 3723.5).abs() < 0.01, "got {result}");
    }

    #[test]
    fn test_time_str_to_secs_invalid() {
        assert_eq!(time_str_to_secs(""), None);
        assert_eq!(time_str_to_secs("not_a_time"), None);
        assert_eq!(time_str_to_secs("01:30"), None); // only 2 parts
    }

    // ── parse_duration_line ───────────────────────────────────────────────────

    #[test]
    fn test_parse_duration_line_found() {
        let line = "  Duration: 00:01:23.45, start: 0.000000, bitrate: 128 kb/s";
        let secs = parse_duration_line(line).unwrap();
        // 1*60 + 23.45 = 83.45
        assert!((secs - 83.45).abs() < 0.01, "got {secs}");
    }

    #[test]
    fn test_parse_duration_line_not_found() {
        assert_eq!(parse_duration_line("some random ffmpeg output"), None);
        assert_eq!(parse_duration_line(""), None);
    }

    // ── format_secs ──────────────────────────────────────────────────────────

    #[test]
    fn test_format_secs_zero() {
        assert_eq!(format_secs(0.0), "00:00:00");
    }

    #[test]
    fn test_format_secs_minutes() {
        assert_eq!(format_secs(90.0), "00:01:30");
    }

    #[test]
    fn test_format_secs_hours() {
        assert_eq!(format_secs(3661.0), "01:01:01");
    }

    // ── HistoryItem defaults (serde round-trip) ───────────────────────────────

    #[test]
    fn test_history_item_serde_roundtrip() {
        let item = HistoryItem {
            id: "abc123".to_string(),
            file_name: "video.mp4".to_string(),
            media_type: "video".to_string(),
            source_format: "mp4".to_string(),
            target_format: "mkv".to_string(),
            output_path: "/tmp/video_converted.mkv".to_string(),
            timestamp: 1_700_000_000,
            status: "success".to_string(),
            file_size: Some("12.4 MB".to_string()),
        };

        let json = serde_json::to_string(&item).expect("serialize");
        let back: HistoryItem = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(back.id, "abc123");
        assert_eq!(back.media_type, "video");
        assert_eq!(back.file_size, Some("12.4 MB".to_string()));
    }

    #[test]
    fn test_history_item_null_file_size() {
        let json = r#"{
            "id":"x","file_name":"a.mp3","media_type":"audio",
            "source_format":"mp3","target_format":"flac",
            "output_path":"/tmp/a_converted.flac",
            "timestamp":0,"status":"success","file_size":null
        }"#;
        let item: HistoryItem = serde_json::from_str(json).expect("deserialize");
        assert_eq!(item.file_size, None);
    }

    // ── Settings defaults ─────────────────────────────────────────────────────

    #[test]
    fn test_settings_default() {
        let s = Settings::default();
        assert_eq!(s.language, "en");
        assert_eq!(s.theme, "dark");
        assert!(s.output_dir.is_none());
        assert_eq!(s.default_video_format, "mp4");
        assert_eq!(s.default_audio_format, "mp3");
        assert_eq!(s.default_image_format, "webp");
        assert_eq!(s.filename_suffix, "_converted");
        assert_eq!(s.conflict_strategy, "rename");
        assert_eq!(s.hw_acceleration, "auto");
    }

    // -- video_codec_args -------------------------------------------------------

    #[test]
    fn test_video_codec_args_simple() {
        assert_eq!(video_codec_args("h264"), ["-c:v", "libx264"]);
        assert_eq!(video_codec_args("h265"), ["-c:v", "libx265"]);
        assert_eq!(video_codec_args("hevc"), ["-c:v", "libx265"]);
        assert_eq!(video_codec_args("vp9"), ["-c:v", "libvpx-vp9"]);
    }

    #[test]
    fn test_video_codec_args_passthrough() {
        assert_eq!(video_codec_args("h264_nvenc"), ["-c:v", "h264_nvenc"]);
        assert_eq!(
            video_codec_args("hevc_videotoolbox"),
            ["-c:v", "hevc_videotoolbox"]
        );
    }
}
