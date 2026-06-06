import { useTranslation } from "react-i18next";

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
        <span className="truncate" style={{ maxWidth: "70%", fontSize: "12px", color: "var(--text-sub)" }}>
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
            width: `${pct}%`,
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
