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
        <div className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-800/40 transition-colors">
            {/* Type badge */}
            <span className="text-[8px] font-bold tracking-wider text-indigo-400 bg-indigo-950 px-2 py-1 rounded shrink-0">
                {mediaCode(item.media_type)}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 font-medium truncate" title={item.file_name}>
                    {item.file_name}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 tracking-wider">
                    <span className="uppercase">{item.source_format}</span>
                    {" → "}
                    <span className="uppercase">{item.target_format}</span>
                    {item.file_size && <span> · {item.file_size}</span>}
                </p>
            </div>

            {/* Date */}
            <span className="text-[10px] text-gray-600 shrink-0 hidden sm:block">
                {formatDate(item.timestamp, t)}
            </span>

            {/* Action buttons — visible on hover */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleOpenFile}
                    title={t("history.openFile")}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-indigo-400 transition-colors text-xs"
                >
                    ↗
                </button>
                <button
                    onClick={handleOpenFolder}
                    title={t("history.openFolder")}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-indigo-400 transition-colors text-xs"
                >
                    ⬛
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
        <div className="flex flex-col gap-4 p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2
                        className="text-gray-100 text-xl font-bold tracking-tight"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                        {t("history.title")}
                    </h2>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={handleClear}
                        className={`px-3 py-1.5 rounded-lg text-[10px] tracking-widest transition-all border ${confirmClear
                            ? "border-red-600 bg-red-950/40 text-red-400"
                            : "border-gray-700 text-gray-500 hover:border-red-600 hover:text-red-400"
                            }`}
                    >
                        {(confirmClear ? t("history.clearConfirm") : t("history.clear")).toUpperCase()}
                    </button>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center flex-1">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-500 gap-3">
                    <span className="text-[10px] tracking-widest">LOG</span>
                    <p className="text-xs tracking-wider">{t("history.empty")}</p>
                </div>
            ) : (
                <div className="flex flex-col bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                    {history.map((item, idx) => (
                        <div
                            key={item.id}
                            className={idx !== history.length - 1 ? "border-b border-gray-700/60" : ""}
                        >
                            <HistoryRow item={item} t={t} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
