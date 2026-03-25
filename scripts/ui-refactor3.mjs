import { writeFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const w = (rel, content) => writeFileSync(resolve(root, rel), content, 'utf8');

// ─── AudioConverter.tsx ───────────────────────────────────────────────────────
w('src/components/Converter/AudioConverter.tsx', `import { useState, useCallback } from "react";
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

const AUDIO_FORMATS = ["mp3", "flac", "wav", "ogg", "aac", "m4a"] as const;
type AudioFormat = (typeof AUDIO_FORMATS)[number];

const BITRATES = [
  { label: "Auto",     value: undefined },
  { label: "128 kbps", value: "128k" },
  { label: "192 kbps", value: "192k" },
  { label: "256 kbps", value: "256k" },
  { label: "320 kbps", value: "320k" },
];

const SAMPLE_RATES = [
  { label: "Original", value: undefined },
  { label: "22050 Hz", value: "22050" },
  { label: "44100 Hz", value: "44100" },
  { label: "48000 Hz", value: "48000" },
  { label: "96000 Hz", value: "96000" },
];

const ACCEPTED_EXTENSIONS = [...AUDIO_FORMATS, "mp4", "mkv", "avi", "mov", "webm"];

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
        const name = f.split(/[\\\\/]/).pop() ?? f;
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

export function AudioConverter() {
  const { t } = useTranslation();
  const { settings } = useSettingsContext();
  const {
    progress, status, error, speed, currentTime,
    results, batchIndex, batchTotal, currentFile,
    convertAudio, convertAudioBatch, getMediaInfo, cancel, reset,
  } = useConversion();

  const [mode, setMode] = useState<"single" | "batch">("single");
  const [inputPath, setInputPath] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [batchFiles, setBatchFiles] = useState<string[]>([]);

  const [outputFormat, setOutputFormat] = useState<AudioFormat>(
    (settings.default_audio_format as AudioFormat) ?? "mp3"
  );
  const [bitrate, setBitrate] = useState<string | undefined>(undefined);
  const [sampleRate, setSampleRate] = useState<string | undefined>(undefined);
  const [normalize, setNormalize] = useState(false);
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
    await convertAudio({ input_path: inputPath, output_path: outputPath, bitrate, sample_rate: sampleRate, normalize });
  }, [inputPath, outputPath, bitrate, sampleRate, normalize, convertAudio]);

  const handleFormatChange = (fmt: AudioFormat) => {
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
    await convertAudioBatch({ files, bitrate, sample_rate: sampleRate, normalize });
  }, [batchFiles, outputFormat, settings.output_dir, bitrate, sampleRate, normalize, convertAudioBatch]);

  const batchProgressLabel =
    batchTotal > 0
      ? \`\${t("batch.progress", { index: Math.min(batchIndex + 1, batchTotal), total: batchTotal })}\${currentFile ? \` — \${currentFile}\` : ""}\`
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
      <div className="card" style={{ padding: "14px 16px" }}>
        <p className="section-label">{t("converter.output_format")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {AUDIO_FORMATS.map((f) => (
            <button key={f} onClick={() => handleFormatChange(f)} className={\`fmt-pill \${outputFormat === f ? "active" : ""}\`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowAdvanced((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--accent)", fontSize: "12px", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}
      >
        <span style={{ display: "flex", transition: "transform 0.15s", transform: showAdvanced ? "rotate(90deg)" : "rotate(0)" }}>
          <IcnChevronRight size={12} />
        </span>
        {t("converter.advancedOptions")}
      </button>

      {showAdvanced && (
        <div className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("converter.bitrate")}</label>
              <select value={bitrate ?? ""} onChange={(e) => setBitrate(e.target.value || undefined)} style={selectCls}>
                {BITRATES.map((b) => <option key={b.label} value={b.value ?? ""}>{b.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{t("converter.sampleRate")}</label>
              <select value={sampleRate ?? ""} onChange={(e) => setSampleRate(e.target.value || undefined)} style={selectCls}>
                {SAMPLE_RATES.map((s) => <option key={s.label} value={s.value ?? ""}>{s.label}</option>)}
              </select>
            </div>
          </div>
          {/* Normalize toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
            <button
              role="checkbox"
              aria-checked={normalize}
              onClick={() => setNormalize((v) => !v)}
              style={{
                width: "36px", height: "20px", borderRadius: "10px",
                background: normalize ? "var(--accent)" : "var(--border2)",
                border: "none", cursor: "pointer", transition: "background 0.15s",
                position: "relative", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: "3px",
                left: normalize ? "18px" : "3px",
                width: "14px", height: "14px", borderRadius: "50%", background: "#fff",
                transition: "left 0.15s",
              }} />
            </button>
            <span style={{ fontSize: "12px", color: "var(--text-sub)", cursor: "pointer" }} onClick={() => setNormalize((v) => !v)}>
              {t("converter.normalize")}
            </span>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{t("nav.audio")}</h2>
          <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px", letterSpacing: "0.04em" }}>
            {t("converter.localOnly") || "100% local"}
          </p>
        </div>
        <div className="seg-ctrl">
          <button className={mode === "single" ? "active" : ""} onClick={() => { setMode("single"); reset(); }}>
            {t("batch.single")}
          </button>
          <button className={mode === "batch" ? "active" : ""} onClick={() => { setMode("batch"); reset(); }}>
            {t("batch.toggle")}
          </button>
        </div>
      </div>

      {mode === "single" && (
        <>
          <DropZone
            onFilesDropped={(files) => { const p = files[0]; if (p) handleFileSelected(p); }}
            allowedExtensions={ACCEPTED_EXTENSIONS}
            disabled={isConverting}
            hasFile={!!inputPath}
          >
            {inputPath ? (
              <>
                <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700, fontSize: "10px", letterSpacing: "0.06em", flexShrink: 0 }}>AUD</div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "6px" }}>
                    {inputPath.split(/[\\\\/]/).pop()}
                  </p>
                  {mediaInfo && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", fontSize: "11px", color: "var(--text-sub)" }}>
                      {mediaInfo.duration > 0 && <span>{formatDuration(mediaInfo.duration)}</span>}
                      {mediaInfo.audio_codec && <span>{mediaInfo.audio_codec}</span>}
                      {mediaInfo.bitrate && <span>{mediaInfo.bitrate}</span>}
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

      {mode === "batch" && (
        <>
          {!isConverting && !isDone && (
            <DropZone
              onFilesDropped={handleBatchFilesAdded}
              allowedExtensions={ACCEPTED_EXTENSIONS}
              multiple={true}
              formats={AUDIO_FORMATS.join(" · ").toUpperCase()}
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
`);

// ─── History.tsx ──────────────────────────────────────────────────────────────
w('src/components/History/History.tsx', `import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useHistory } from "../../hooks/useHistory";
import type { HistoryItem } from "../../hooks/useHistory";
import { IcnImage, IcnVideo, IcnAudio, IcnCheck, IcnFolder } from "../ui/Icons";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function MediaIcon({ type }: { type: HistoryItem["media_type"] }) {
  const props = { size: 14, strokeWidth: 2 };
  if (type === "video") return <IcnVideo {...props} />;
  if (type === "audio") return <IcnAudio {...props} />;
  return <IcnImage {...props} />;
}

const TYPE_COLOR: Record<HistoryItem["media_type"], string> = {
  video: "#7c6aff",
  audio: "#a78bfa",
  image: "#60a5fa",
};

function formatDate(ts: number, t: TFunction): string {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return t("history.dateFormat.today", { time });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return t("history.dateFormat.yesterday", { time });
  return d.toLocaleDateString();
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function HistoryRow({ item, t }: { item: HistoryItem; t: TFunction }) {
  const handleOpenFile = () =>
    invoke("open_file", { path: item.output_path } as unknown as Record<string, unknown>).catch(() => {});
  const handleOpenFolder = () =>
    invoke("open_folder", { file_path: item.output_path } as unknown as Record<string, unknown>).catch(() => {});

  return (
    <div
      className="slide-in"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        alignItems: "center",
        gap: "12px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px 14px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Type badge */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: "var(--surface2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: TYPE_COLOR[item.media_type],
          flexShrink: 0,
          border: "1px solid var(--border)",
        }}
      >
        <MediaIcon type={item.media_type} />
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <p
          style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={item.file_name}
        >
          {item.file_name}
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-sub)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
          {item.output_path && (
            <span style={{ color: "var(--success)", display: "inline-flex", alignItems: "center" }}>
              <IcnCheck size={12} strokeWidth={2.5} />
            </span>
          )}
          <span style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.source_format}</span>
          <span style={{ color: "var(--muted)" }}>→</span>
          <span style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, color: "var(--accent)" }}>{item.target_format}</span>
          {item.file_size && <span style={{ color: "var(--muted)" }}> · {item.file_size}</span>}
        </p>
      </div>

      {/* Date — aligned in its own column */}
      <span style={{ fontSize: "11px", color: "var(--muted)", whiteSpace: "nowrap", textAlign: "right" }}>
        {formatDate(item.timestamp, t)}
      </span>

      {/* Actions */}
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <button
          className="btn-ghost"
          onClick={handleOpenFile}
          title={t("history.openFile")}
          style={{ padding: "6px 10px", fontSize: "11px" }}
        >
          {t("history.openFile")}
        </button>
        <button
          className="btn-ghost"
          onClick={handleOpenFolder}
          title={t("history.openFolder")}
          style={{ padding: "6px 8px", fontSize: "11px" }}
        >
          <IcnFolder size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function History() {
  const { t } = useTranslation();
  const { history, isLoading, clearHistory } = useHistory();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    await clearHistory();
    setConfirmClear(false);
  };

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
          {t("history.title")}
        </h2>
        {history.length > 0 && (
          <button
            className={confirmClear ? "btn-danger" : "btn-ghost"}
            onClick={handleClear}
            style={{ fontSize: "12px" }}
          >
            {confirmClear ? t("history.clearConfirm") : t("history.clear")}
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "24px", height: "24px", border: "2px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%" }} className="animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <IcnHistory size={40} strokeWidth={1.25} color="var(--border2)" />
          <p style={{ fontSize: "13px", color: "var(--muted)" }}>{t("history.empty")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {history.map((item) => (
            <HistoryRow key={item.id} item={item} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
`);

console.log('✅ AudioConverter + History written');
