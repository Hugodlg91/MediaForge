import { writeFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const w = (rel, content) => writeFileSync(resolve(root, rel), content, 'utf8');

// ─── DropZone.tsx ────────────────────────────────────────────────────────────
w('src/components/ui/DropZone.tsx', `import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { useDragDrop } from "../../hooks/useDragDrop";
import { IcnUpload } from "./Icons";

interface DropZoneProps {
  onFilesDropped: (files: string[]) => void;
  allowedExtensions: string[];
  multiple?: boolean;
  label?: string;
  disabled?: boolean;
  hasFile?: boolean;
  className?: string;
  children?: React.ReactNode;
  formats?: string;
}

export function DropZone({
  onFilesDropped,
  allowedExtensions,
  multiple = false,
  label,
  disabled = false,
  hasFile = false,
  className,
  children,
  formats,
}: DropZoneProps) {
  const { t } = useTranslation();
  const { isDragging, droppedFiles, bind, reset } = useDragDrop();

  useEffect(() => {
    bind(allowedExtensions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bind]);

  useEffect(() => {
    if (droppedFiles.length > 0) {
      onFilesDropped(multiple ? droppedFiles : [droppedFiles[0]]);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedFiles]);

  const handleClick = async () => {
    if (disabled) return;
    const selected = await open({
      multiple,
      filters: [{ name: label ?? "Files", extensions: allowedExtensions }],
    });
    if (!selected) return;
    const files = Array.isArray(selected) ? selected : [selected];
    if (files.length > 0) onFilesDropped(files);
  };

  const isHighlighted = isDragging || hasFile;

  return (
    <div
      onClick={!disabled ? handleClick : undefined}
      style={{
        border: \`2px dashed \${isHighlighted ? "var(--accent)" : "var(--border2)"}\`,
        borderRadius: "12px",
        background: isHighlighted ? "var(--accent-dim)" : "var(--surface2)",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color 0.15s, background 0.15s",
      }}
      className={className}
      onMouseEnter={(e) => {
        if (!disabled && !isHighlighted) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--accent-dim)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isHighlighted) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--surface2)";
        }
      }}
    >
      {children ?? (
        <>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "var(--accent-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              flexShrink: 0,
            }}
          >
            <IcnUpload size={28} strokeWidth={1.5} />
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
              {label ?? t("dropzone.label")}
            </p>
            <p style={{ fontSize: "12px", color: "var(--muted)" }}>
              {t("dropzone.or")}{" "}
              <span style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: 500 }}>
                {t("dropzone.browse")}
              </span>
            </p>
          </div>

          {formats && (
            <p style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "0.06em", textAlign: "center" }}>
              {formats}
            </p>
          )}
        </>
      )}
    </div>
  );
}
`);

// ─── ConversionResult.tsx ────────────────────────────────────────────────────
w('src/components/ui/ConversionResult.tsx', `import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { IcnCheck, IcnFolder } from "./Icons";

interface ConversionResultProps {
  outputPath: string;
  onNewConversion: () => void;
}

export function ConversionResult({ outputPath, onNewConversion }: ConversionResultProps) {
  const { t } = useTranslation();
  const fileName = outputPath.split(/[\\/]/).pop() ?? outputPath;

  const handleOpenFolder = useCallback(async () => {
    try {
      await invoke("open_folder", { filePath: outputPath } as unknown as Record<string, unknown>);
    } catch (e) {
      console.error("open_folder error:", e);
    }
  }, [outputPath]);

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Success card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(16, 185, 129, 0.06)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: "12px",
          padding: "14px 16px",
        }}
      >
        {/* Check icon */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--success)",
          }}
        >
          <IcnCheck size={16} strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--success)", letterSpacing: "0.06em", marginBottom: "2px" }}>
            {t("result.success").toUpperCase()}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-sub)" }} className="truncate" title={outputPath}>
            {fileName}
          </p>
        </div>

        <button className="btn-ghost" onClick={handleOpenFolder} style={{ flexShrink: 0, gap: "6px" }}>
          <IcnFolder size={14} />
          {t("result.openFolder")}
        </button>
      </div>

      <button className="btn-primary" onClick={onNewConversion} style={{ width: "fit-content" }}>
        {t("result.newConversion")}
      </button>
    </div>
  );
}
`);

// ─── ProgressBar.tsx ─────────────────────────────────────────────────────────
w('src/components/Converter/ProgressBar.tsx', `import { useTranslation } from "react-i18next";

interface ProgressBarProps {
  progress: number;
  currentTime?: string;
  speed?: string;
  currentFile?: string;
  onCancel?: () => void;
}

export function ProgressBar({ progress, currentTime, speed, currentFile, onCancel }: ProgressBarProps) {
  const { t } = useTranslation();
  const pct = Math.round(Math.min(100, Math.max(0, progress)));

  return (
    <div className="card" style={{ gap: 0 }}>
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-sub)" }} className="truncate" style={{ maxWidth: "70%", fontSize: "12px", color: "var(--text-sub)" }}>
          {currentFile ?? currentTime ?? "—"}
        </span>
        <div style={{ display: "flex", gap: "12px", alignItems: "baseline", flexShrink: 0 }}>
          {speed && <span style={{ fontSize: "11px", color: "var(--muted)" }}>{speed}</span>}
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>{pct}%</span>
        </div>
      </div>

      {/* Track */}
      <div style={{ height: "4px", background: "var(--border2)", borderRadius: "4px", overflow: "hidden" }}>
        <div
          className="animate-progress-glow"
          style={{
            height: "100%",
            width: \`\${pct}%\`,
            background: "linear-gradient(90deg, var(--accent), var(--accent-hover))",
            borderRadius: "4px",
            transition: "width 0.2s ease",
          }}
        />
      </div>

      {onCancel && (
        <button className="btn-ghost" onClick={onCancel} style={{ marginTop: "12px", width: "fit-content" }}>
          {t("converter.cancel")}
        </button>
      )}
    </div>
  );
}
`);

console.log('✅ DropZone, ConversionResult, ProgressBar written');
