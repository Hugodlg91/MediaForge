import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import {
  useConversion,
  MediaInfo,
  BatchMediaItem,
  BatchResult,
} from "../../hooks/useConversion";
import { buildOutputPath, formatFileSize, formatDuration } from "../../utils/path";
import { useSettingsContext } from "../../context/SettingsContext";
import { ProgressBar } from "./ProgressBar";
import { DropZone } from "../ui/DropZone";
import { ConversionResult } from "../ui/ConversionResult";

// ─── Constants ────────────────────────────────────────────────────────────────

const VIDEO_FORMATS = ["mp4", "mkv", "avi", "mov", "webm"] as const;
type VideoFormat = (typeof VIDEO_FORMATS)[number];

const RESOLUTIONS = [
  { label: "Original", value: undefined },
  { label: "720p", value: "1280:720" },
  { label: "1080p", value: "1920:1080" },
  { label: "4K", value: "3840:2160" },
];

const CODECS = [
  { label: "Auto", value: undefined },
  { label: "H.264", value: "h264" },
  { label: "H.265", value: "h265" },
  { label: "VP9", value: "vp9" },
];

const BITRATES = [
  { label: "Auto", value: undefined },
  { label: "1 Mbps", value: "1M" },
  { label: "2 Mbps", value: "2M" },
  { label: "5 Mbps", value: "5M" },
  { label: "10 Mbps", value: "10M" },
];

// ─── Batch file list ──────────────────────────────────────────────────────────

function MediaBatchFileList({
  files,
  results,
  onRemove,
}: {
  files: string[];
  results: BatchResult[] | null;
  onRemove?: (path: string) => void;
}) {
  const { t } = useTranslation();
  if (files.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
      {files.map((f) => {
        const name = f.split(/[\\/]/).pop() ?? f;
        const result = results?.find((r) => r.input === f);
        return (
          <div
            key={f}
            className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 gap-2"
          >
            <span className="text-xs text-gray-300 truncate flex-1">{name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {result ? (
                result.success ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <span
                    className="text-red-400 text-xs"
                    title={result.error ?? t("converter.error")}
                  >
                    ✕
                  </span>
                )
              ) : onRemove ? (
                <button
                  onClick={() => onRemove(f)}
                  className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VideoConverter() {
  const { t } = useTranslation();
  const { settings } = useSettingsContext();
  const {
    progress, status, error, speed, currentTime,
    results, batchIndex, batchTotal, currentFile,
    convertVideo, convertVideoBatch, getMediaInfo, cancel, reset,
  } = useConversion();

  const [mode, setMode] = useState<"single" | "batch">("single");

  // Single mode
  const [inputPath, setInputPath] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  // Batch mode
  const [batchFiles, setBatchFiles] = useState<string[]>([]);

  // Shared options
  const [outputFormat, setOutputFormat] = useState<VideoFormat>(
    (settings.default_video_format as VideoFormat) ?? "mp4"
  );
  const [resolution, setResolution] = useState<string | undefined>(undefined);
  const [codec, setCodec] = useState<string | undefined>(undefined);
  const [bitrate, setBitrate] = useState<string | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isConverting = status === "converting";
  const isDone = status === "done";

  // ── Single mode handlers ───────────────────────────────────────────────────

  const handleFileSelected = useCallback(
    async (path: string) => {
      setInputPath(path);
      setOutputPath(buildOutputPath(path, outputFormat, settings.output_dir ?? undefined));
      reset();
      setMediaInfo(null);
      try {
        const info = await getMediaInfo(path);
        setMediaInfo(info);
      } catch {
        // non-blocking
      }
    },
    [outputFormat, settings.output_dir, getMediaInfo, reset]
  );

  const handleConvert = useCallback(async () => {
    if (!inputPath || !outputPath) return;
    await convertVideo({ input_path: inputPath, output_path: outputPath, resolution, codec, bitrate });
  }, [inputPath, outputPath, resolution, codec, bitrate, convertVideo]);

  const handleFormatChange = (fmt: VideoFormat) => {
    setOutputFormat(fmt);
    if (inputPath) setOutputPath(buildOutputPath(inputPath, fmt, settings.output_dir ?? undefined));
  };

  // ── Batch mode handlers ────────────────────────────────────────────────────

  const handleBatchFilesAdded = useCallback(
    (paths: string[]) => {
      setBatchFiles((prev) => {
        const set = new Set(prev);
        paths.forEach((p) => set.add(p));
        return Array.from(set);
      });
      reset();
    },
    [reset]
  );

  const handleConvertBatch = useCallback(async () => {
    if (batchFiles.length === 0) return;
    const files: BatchMediaItem[] = batchFiles.map((p) => ({
      input_path: p,
      output_path: buildOutputPath(p, outputFormat, settings.output_dir ?? undefined),
    }));
    await convertVideoBatch({ files, resolution, codec, bitrate });
  }, [batchFiles, outputFormat, settings.output_dir, resolution, codec, bitrate, convertVideoBatch]);

  // ── Progress label for batch ───────────────────────────────────────────────

  const batchProgressLabel =
    batchTotal > 0
      ? `${t("batch.progress", { index: Math.min(batchIndex + 1, batchTotal), total: batchTotal })}${currentFile ? ` — ${currentFile}` : ""}`
      : undefined;

  // ── Options panel (shared between modes) ──────────────────────────────────

  const selectCls = "bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-600";

  const optionsPanel = (
    <>
      {/* Format pills */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="text-[10px] text-gray-500 tracking-widest mb-3">
          {t("converter.output_format").toUpperCase()}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => handleFormatChange(f)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium tracking-wider transition-all border ${
                outputFormat === f
                  ? "border-indigo-600 bg-indigo-950 text-indigo-400"
                  : "border-gray-700 text-gray-500 hover:border-indigo-600 hover:text-indigo-400"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-2 text-indigo-400 text-xs w-fit hover:text-indigo-300 transition-colors tracking-wider"
      >
        <span className={`transition-transform text-[8px] ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
        {t("converter.advancedOptions").toUpperCase()}
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-500 text-[10px] tracking-widest">{t("converter.resolution").toUpperCase()}</label>
            <select value={resolution ?? ""} onChange={(e) => setResolution(e.target.value || undefined)} className={selectCls}>
              {RESOLUTIONS.map((r) => <option key={r.label} value={r.value ?? ""}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-500 text-[10px] tracking-widest">{t("converter.codec").toUpperCase()}</label>
            <select value={codec ?? ""} onChange={(e) => setCodec(e.target.value || undefined)} className={selectCls}>
              {CODECS.map((c) => <option key={c.label} value={c.value ?? ""}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-500 text-[10px] tracking-widest">{t("converter.bitrate").toUpperCase()}</label>
            <select value={bitrate ?? ""} onChange={(e) => setBitrate(e.target.value || undefined)} className={selectCls}>
              {BITRATES.map((b) => <option key={b.label} value={b.value ?? ""}>{b.label}</option>)}
            </select>
          </div>
        </div>
      )}
    </>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 p-6 h-full overflow-y-auto">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-gray-100 text-xl font-bold tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {t("nav.video")}
          </h2>
          <p className="text-[10px] text-gray-500 tracking-widest mt-0.5">100% LOCAL</p>
        </div>
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => { setMode("single"); reset(); }}
            className={`px-3 py-1.5 rounded-md transition-colors tracking-wider ${mode === "single" ? "bg-indigo-950 text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t("batch.single").toUpperCase()}
          </button>
          <button
            onClick={() => { setMode("batch"); reset(); }}
            className={`px-3 py-1.5 rounded-md transition-colors tracking-wider ${mode === "batch" ? "bg-indigo-950 text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t("batch.toggle").toUpperCase()}
          </button>
        </div>
      </div>

      {/* ── Single mode ──────────────────────────────────────────────────────── */}
      {mode === "single" && (
        <>
          <DropZone
            onFilesDropped={(files) => { const p = files[0]; if (p) handleFileSelected(p); }}
            allowedExtensions={[...VIDEO_FORMATS]}
            disabled={isConverting}
            hasFile={!!inputPath}
          >
            {inputPath ? (
              <>
                <span className="text-3xl">🎬</span>
                <p className="text-white text-sm font-medium text-center break-all">
                  {inputPath.split(/[\\/]/).pop()}
                </p>
                {mediaInfo && (
                  <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-400 mt-1">
                    {mediaInfo.duration > 0 && <span>⏱ {formatDuration(mediaInfo.duration)}</span>}
                    {mediaInfo.width && mediaInfo.height && (
                      <span>📐 {mediaInfo.width}×{mediaInfo.height}</span>
                    )}
                    {mediaInfo.video_codec && <span>🎞 {mediaInfo.video_codec}</span>}
                    <span>💾 {formatFileSize(mediaInfo.file_size)}</span>
                  </div>
                )}
                {!isConverting && (
                  <span className="text-xs text-indigo-400 mt-1">{t("dropzone.fileLoaded")}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-4xl">🎬</span>
                <p className="text-gray-300 text-sm font-medium">{t("dropzone.label")}</p>
                <p className="text-gray-500 text-xs">
                  {t("converter.dropzone_sub", { formats: VIDEO_FORMATS.join(", ").toUpperCase() })}
                </p>
              </>
            )}
          </DropZone>

          {inputPath && !isConverting && !isDone && (
            <>
              {optionsPanel}
              <button
                onClick={handleConvert}
                className="w-full py-3 bg-indigo-600 hover:opacity-90 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all tracking-widest"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {t("converter.convert").toUpperCase()}
              </button>
            </>
          )}

          {isConverting && (
            <ProgressBar progress={progress} currentTime={currentTime} speed={speed} onCancel={cancel} />
          )}

          {isDone && outputPath && (
            <ConversionResult
              outputPath={outputPath}
              onNewConversion={() => { reset(); setInputPath(null); setMediaInfo(null); }}
            />
          )}
        </>
      )}

      {/* ── Batch mode ───────────────────────────────────────────────────────── */}
      {mode === "batch" && (
        <>
          {!isConverting && !isDone && (
            <DropZone
              onFilesDropped={handleBatchFilesAdded}
              allowedExtensions={[...VIDEO_FORMATS]}
              multiple={true}
            >
              <span className="text-2xl">🎬</span>
              <span className="text-gray-400 text-sm">
                {batchFiles.length > 0
                  ? t("batch.fileCount", { count: batchFiles.length })
                  : t("dropzone.label")}
              </span>
              <span className="text-xs text-indigo-400">{t("dropzone.browse")}</span>
            </DropZone>
          )}

          <MediaBatchFileList
            files={batchFiles}
            results={results}
            onRemove={(p) => setBatchFiles((prev) => prev.filter((f) => f !== p))}
          />

          {batchFiles.length > 0 && !isConverting && !isDone && (
            <>
              {optionsPanel}
              <button
                onClick={handleConvertBatch}
                className="w-full py-3 bg-indigo-600 hover:opacity-90 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all tracking-widest"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {t("converter.convert").toUpperCase()} ({batchFiles.length})
              </button>
            </>
          )}

          {isConverting && (
            <ProgressBar progress={progress} currentFile={batchProgressLabel} onCancel={cancel} />
          )}

          {isDone && results && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400 font-medium">
                  ✓ {t("batch.successCount", { count: results.filter((r) => r.success).length })}
                </span>
                {results.some((r) => !r.success) && (
                  <span className="text-red-400">
                    ✕ {t("batch.errorCount", { count: results.filter((r) => !r.success).length })}
                  </span>
                )}
              </div>
              <MediaBatchFileList files={batchFiles} results={results} />
              <div className="flex gap-3 flex-wrap">
                {results.some((r) => r.success) && (
                  <button
                    onClick={async () => {
                      const first = results.find((r) => r.success);
                      if (first) {
                        await invoke("open_folder", {
                          filePath: first.output,
                        } as unknown as Record<string, unknown>);
                      }
                    }}
                    className="px-4 py-2 border border-gray-700 hover:border-gray-600 text-gray-300 text-xs rounded-lg transition-colors tracking-wider"
                  >
                    {t("result.openFolder").toUpperCase()}
                  </button>
                )}
                <button
                  onClick={() => { reset(); setBatchFiles([]); }}
                  className="px-4 py-2 bg-indigo-600 hover:opacity-90 text-white text-xs rounded-lg transition-all tracking-wider font-bold"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {t("result.newConversion").toUpperCase()}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Error (both modes) ───────────────────────────────────────────────── */}
      {status === "error" && error && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg p-3">
          <span>✕</span>
          <span>{t("converter.error")}: {error}</span>
        </div>
      )}
    </div>
  );
}
