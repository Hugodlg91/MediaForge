import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { useDragDrop } from "../../hooks/useDragDrop";

interface DropZoneProps {
  onFilesDropped: (files: string[]) => void;
  allowedExtensions: string[];
  multiple?: boolean;
  label?: string;
  disabled?: boolean;
  hasFile?: boolean;
  /** Override the inner layout classes (default: centered column with padding) */
  className?: string;
  children?: React.ReactNode;
  /** Comma-separated list of formats to show below the upload hint */
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
        border: `1.5px dashed ${isHighlighted ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "10px",
        background: isHighlighted ? "var(--accent-dim)" : "var(--surface)",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
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
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--surface)";
        }
      }}
    >
      {children ?? (
        <>
          {/* Plus icon */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "var(--accent-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              color: "var(--accent)",
              fontWeight: 200,
              flexShrink: 0,
            }}
          >
            +
          </div>

          <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
            {label ?? t("dropzone.label")}
          </p>
          <p style={{ fontSize: "12px", color: "var(--muted)" }}>
            {t("dropzone.or")}{" "}
            <span style={{ color: "var(--accent)", textDecoration: "underline" }}>
              {t("dropzone.browse")}
            </span>
          </p>
          {formats && (
            <p
              style={{
                fontSize: "10px",
                color: "var(--muted)",
                letterSpacing: "0.06em",
                textAlign: "center",
              }}
            >
              {formats}
            </p>
          )}
        </>
      )}
    </div>
  );
}
