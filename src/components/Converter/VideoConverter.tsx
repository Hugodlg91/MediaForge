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
import { IcnCheck, IcnX, IcnFolder, IcnChevronRight } from "../ui/Icons";

// ─── Constants ────────────────────────────────────────────────────────────────

const VIDEO_FORMATS = ["mp4", "mkv", "avi", "mov", "webm"] as const;
type VideoFormat = (typeof VIDEO_FORMATS)[number];

const RESOLUTIONS = [
  { label: "Original", value: undefined },
  { label: "720p",  value: "1280:720" },
  { label: "1080p", value: "1920:1080" },
  { label: "4K",    value: "3840:2160" },
];

const CODECS = [
  { label: "Auto",  value: undefined },
  { label: "H.264", value: "h264" },
  { label: "H.265", value: "h265" },
  { label: "VP9",   value: "vp9" },
];

const BITRATES = [
  { label: "Auto",    value: undefined },
  { label: "1 Mbps",  value: "1M" },
  { label: "2 Mbps",  value: "2M" },
  { label: "5 Mbps",  value: "5M" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
      {files.map((f) => {
        const name = f.split(/[\\/]/).pop() ?? f;
        const result = results?.find((r) => r.input === f);
        return (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
          >
            {/* Status / remove */}
            <div style={{ flexShrink: 0, width: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {result ? (
                result.success ? (
                  <span style={{ color: "var(--success)" }}><IcnCheck size={15} strokeWidth={2.5} /></span>
                ) : (
                  <span style={{ color: "var(--error)" }} title={result.error ?? t("converter.error")}>
                    <IcnX size={14} strokeWidth={2.5} />
                  </span>
                )
              ) : onRemove ? (
                <button
                  onClick={() => onRemove(f)}
                  style={{ color: "var(--muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--error)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
                >
                  <IcnX size={14} strokeWidth={2} />
                </button>
              ) : (
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--border2)", display: "inline-block" }} />
              )}
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-sub)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
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
  const [inputPath, setInputPath] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [batchFiles, setBatchFiles] = useState<string[]>([]);

  const [outputFormat, setOutputFormat] = useState<VideoFormat>(
    (settings.default_video_format as VideoFormat) ?? "mp4"
  );
  const [resolution, setResolution] = useState<string | undefined>(undefined);
  const [codec, setCodec] = useState<string | undefined>(undefined);
  const [bitrate, setBitrate] = useState<string | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isConverting = status === "converting";
  const isDone = status === "done";

  const handleFileSelected = useCallback(
    async (path: string) => {
      setInputPath(path);
      setOutputPath(buildOutputPath(path, outputFormat, settings.output_dir ?? undefined));
      reset();
      setMediaInfo(null);
      try { const info = await getMediaInfo(path); setMediaInfo(info); } catch { /* non-blocking */ }
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

  const handleBatchFilesAdded = useCallback(
    (paths: string[]) => {
      setBatchFiles((prev) => { const s = new Set(prev); paths.forEach((p) => s.add(p)); return Array.from(s); });
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

  const batchProgressLabel =
    batchTotal > 0
      ? `${t("batch.progress", { index: Math.min(batchIndex + 1, batchTotal), total: batchTotal })}${currentFile ? ` — ${currentFile}` : ""}`
      : undefined;

  const selectCls: React.CSSProperties = {
    background: "var(--surface2)",
    border: "1px solid var(--border2)",
    color: "var(--text)",
    fontSize: "12px",
    borderRadius: "8px",
    padding: "7px 10px",
    outline: "none",
    width: "100%",
    cursor: "pointer",
  };

  const optionsPanel = (
    <>
      {/* Format pills */}
      <div className="card" style={{ padding: "14px 16px" }}>
        <p className="section-label">{t("converter.output_format")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {VIDEO_FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => handleFormatChange(f)}
              className={`fmt-pill ${outputFormat === f ? "active" : ""}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--accent)",
          fontSize: "12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontWeight: 500,
          padding: 0,
        }}
      >
        <span style={{ display: "flex", transition: "transform 0.15s", transform: showAdvanced ? "rotate(90deg)" : "rotate(0)" }}>
          <IcnChevronRight size={12} />
        </span>
        {t("converter.advancedOptions")}
      </button>

      {showAdvanced && (
        <div className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {[
              { label: t("converter.resolution"), value: resolution, setter: setResolution, opts: RESOLUTIONS },
              { label: t("converter.codec"),      value: codec,      setter: setCodec,      opts: CODECS },
              { label: t("converter.bitrate"),    value: bitrate,    setter: setBitrate,    opts: BITRATES },
            ].map(({ label, value, setter, opts }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</label>
                <select value={value ?? ""} onChange={(e) => setter(e.target.value || undefined)} style={selectCls}>
                  {opts.map((o) => <option key={o.label} value={o.value ?? ""}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px", height: "100%", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{t("nav.video")}</h2>
          <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px", letterSpacing: "0.04em" }}>
            {t("converter.localOnly") || "100% local"}
          </p>
        </div>
        {/* Segmented control */}
        <div className="seg-ctrl">
          <button className={mode === "single" ? "active" : ""} onClick={() => { setMode("single"); reset(); }}>
            {t("batch.single")}
          </button>
          <button className={mode === "batch" ? "active" : ""} onClick={() => { setMode("batch"); reset(); }}>
            {t("batch.toggle")}
          </button>
        </div>
      </div>

      {/* ── Single mode ──────────────────────────────────────────────────── */}
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
                <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700, fontSize: "10px", letterSpacing: "0.06em", flexShrink: 0 }}>VID</div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>
                    {inputPath.split(/[\\/]/).pop()}
                  </p>
                  {mediaInfo && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", fontSize: "11px", color: "var(--text-sub)" }}>
                      {mediaInfo.duration > 0 && <span>{formatDuration(mediaInfo.duration)}</span>}
                      {mediaInfo.width && mediaInfo.height && <span>{mediaInfo.width}×{mediaInfo.height}</span>}
                      {mediaInfo.video_codec && <span>{mediaInfo.video_codec}</span>}
                      <span>{formatFileSize(mediaInfo.file_size)}</span>
                    </div>
                  )}
                </div>
                {!isConverting && <span style={{ fontSize: "11px", color: "var(--accent)" }}>{t("dropzone.fileLoaded")}</span>}
              </>
            ) : undefined}
          </DropZone>

          {inputPath && !isConverting && !isDone && (
            <>
              {optionsPanel}
              <button className="btn-primary" onClick={handleConvert} style={{ width: "100%" }}>
                {t("converter.convert")}
              </button>
            </>
          )}

          {isConverting && <ProgressBar progress={progress} currentTime={currentTime} speed={speed} onCancel={cancel} />}
          {isDone && outputPath && (
            <ConversionResult outputPath={outputPath} onNewConversion={() => { reset(); setInputPath(null); setMediaInfo(null); }} />
          )}
        </>
      )}

      {/* ── Batch mode ──────────────────────────────────────────────────── */}
      {mode === "batch" && (
        <>
          {!isConverting && !isDone && (
            <DropZone
              onFilesDropped={handleBatchFilesAdded}
              allowedExtensions={[...VIDEO_FORMATS]}
              multiple={true}
              formats={VIDEO_FORMATS.join(" · ").toUpperCase()}
            />
          )}

          <MediaBatchFileList
            files={batchFiles}
            results={results}
            onRemove={(p) => setBatchFiles((prev) => prev.filter((f) => f !== p))}
          />

          {batchFiles.length > 0 && !isConverting && !isDone && (
            <>
              {optionsPanel}
              <button className="btn-primary" onClick={handleConvertBatch} style={{ width: "100%" }}>
                {t("converter.convert")} ({batchFiles.length})
              </button>
            </>
          )}

          {isConverting && <ProgressBar progress={progress} currentFile={batchProgressLabel} onCancel={cancel} />}

          {isDone && results && (
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--success)", fontSize: "13px", fontWeight: 600 }}>
                  <IcnCheck size={15} strokeWidth={2.5} />
                  {t("batch.successCount", { count: results.filter((r) => r.success).length })}
                </span>
                {results.some((r) => !r.success) && (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--error)", fontSize: "13px" }}>
                    <IcnX size={14} strokeWidth={2.5} />
                    {t("batch.errorCount", { count: results.filter((r) => !r.success).length })}
                  </span>
                )}
              </div>
              <MediaBatchFileList files={batchFiles} results={results} />
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {results.some((r) => r.success) && (
                  <button className="btn-ghost" onClick={async () => {
                    const first = results.find((r) => r.success);
                    if (first) await invoke("open_folder", { filePath: first.output } as unknown as Record<string, unknown>);
                  }}>
                    <IcnFolder size={14} />{t("result.openFolder")}
                  </button>
                )}
                <button className="btn-primary" onClick={() => { reset(); setBatchFiles([]); }}>
                  {t("result.newConversion")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {status === "error" && error && (
        <div style={{ display: "flex", gap: "8px", color: "var(--error)", fontSize: "13px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
          <IcnX size={15} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: "1px" }} />
          <span>{t("converter.error")}: {error}</span>
        </div>
      )}
    </div>
  );
}
