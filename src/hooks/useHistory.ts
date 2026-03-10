import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HistoryItem {
    id: string;
    file_name: string;
    media_type: "image" | "video" | "audio";
    source_format: string;
    target_format: string;
    output_path: string;
    timestamp: number;
    status: "success" | "error";
    file_size?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHistory() {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshHistory = useCallback(async () => {
        try {
            const items = await invoke<HistoryItem[]>("get_history");
            setHistory(items);
        } catch {
            setHistory([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshHistory();
    }, [refreshHistory]);

    const clearHistory = useCallback(async () => {
        await invoke("clear_history");
        setHistory([]);
    }, []);

    return { history, isLoading, clearHistory, refreshHistory };
}
