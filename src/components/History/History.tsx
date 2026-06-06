import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useHistory } from "../../hooks/useHistory";
import type { HistoryItem } from "../../hooks/useHistory";
import { IcnImage, IcnVideo, IcnAudio, IcnCheck, IcnFolder, IcnHistory } from "../ui/Icons";

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
