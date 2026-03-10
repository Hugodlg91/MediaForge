import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useHistory } from "../../hooks/useHistory";
import type { HistoryItem } from "../../hooks/useHistory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mediaCode(type: HistoryItem["media_type"]) {
    switch (type) {
        case "video": return "VID";
        case "audio": return "AUD";
        case "image": return "IMG";
    }
}

function formatDate(ts: number, t: TFunction): string {
    const d = new Date(ts);
    const now = new Date();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (isSameDay(d, now)) return t("history.dateFormat.today", { time });

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(d, yesterday)) return t("history.dateFormat.yesterday", { time });

    return d.toLocaleDateString();
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function HistoryRow({ item, t }: { item: HistoryItem; t: TFunction }) {
    const handleOpenFile = () =>
        invoke("open_file", { path: item.output_path } as unknown as Record<string, unknown>).catch(() => { });
    const handleOpenFolder = () =>
        invoke("open_folder", { file_path: item.output_path } as unknown as Record<string, unknown>).catch(() => { });

    return (
        <div
            style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
            }}
            className="slide-in"
        >
            {/* Status dot */}
            <span
                style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: item.output_path ? "#4ade80" : "#f87171",
                    flexShrink: 0,
                    display: "inline-block",
                }}
            />

            {/* Type badge */}
            <span
                style={{
                    fontSize: "10px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "var(--surface2)",
                    color: "var(--muted)",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    flexShrink: 0,
                }}
            >
                {mediaCode(item.media_type)}
            </span>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                    title={item.file_name}
                >
                    {item.file_name}
                </p>
                <p style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                    <span style={{ textTransform: "uppercase" }}>{item.source_format}</span>
                    {" → "}
                    <span style={{ textTransform: "uppercase" }}>{item.target_format}</span>
                    {item.file_size && <span> · {item.file_size}</span>}
                </p>
            </div>

            {/* Date */}
            <span style={{ fontSize: "10px", color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                {formatDate(item.timestamp, t)}
            </span>

            {/* Actions */}
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                <button
                    onClick={handleOpenFile}
                    title={t("history.openFile")}
                    style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--muted)",
                        fontSize: "10px",
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                    }}
                >
                    OUVRIR
                </button>
                <button
                    onClick={handleOpenFolder}
                    title={t("history.openFolder")}
                    style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--muted)",
                        fontSize: "10px",
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                    }}
                >
                    DOSSIER
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
        <div style={{ padding: "24px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2
                    style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "22px",
                        letterSpacing: "-0.02em",
                        color: "var(--text)",
                    }}
                >
                    {t("history.title")}
                </h2>
                {history.length > 0 && (
                    <button
                        onClick={handleClear}
                        style={{
                            padding: "4px 12px",
                            borderRadius: "6px",
                            border: confirmClear ? "1px solid #f87171" : "1px solid var(--border)",
                            background: confirmClear ? "rgba(248,113,113,0.08)" : "transparent",
                            color: confirmClear ? "#f87171" : "var(--muted)",
                            fontSize: "10px",
                            cursor: "pointer",
                            letterSpacing: "0.08em",
                            transition: "all 0.15s",
                        }}
                    >
                        {(confirmClear ? t("history.clearConfirm") : t("history.clear")).toUpperCase()}
                    </button>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : history.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--muted)" }}>
                    <span style={{ fontSize: "10px", letterSpacing: "0.1em" }}>LOG</span>
                    <p style={{ fontSize: "12px", letterSpacing: "0.04em" }}>{t("history.empty")}</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {history.map((item) => (
                        <HistoryRow key={item.id} item={item} t={t} />
                    ))}
                </div>
            )}
        </div>
    );
}
