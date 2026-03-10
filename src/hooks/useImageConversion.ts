import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useEffect, useRef, useCallback } from "react";
import type { HistoryItem } from "./useHistory";

// ─── History helpers ─────────────────────────────────────────────────────────

function recordHistory(item: HistoryItem) {
  invoke("add_history_item", { item } as unknown as Record<string, unknown>).catch(() => { });
}
function fileNameFromPath(p: string): string {
  return p.replace(/\\/g, "/").split("/").pop() ?? p;
}
function extFromPath(p: string): string {
  const parts = fileNameFromPath(p).split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  file_size: number;
  has_alpha: boolean;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  keep_aspect_ratio: boolean;
}

export interface BatchImageItem {
  input_path: string;
  output_path: string;
}

export interface BatchResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
}

interface ConvertImageParams {
  input_path: string;
  output_path: string;
  format: string;
  quality?: number;
  resize?: ResizeOptions;
}

interface ConvertBatchParams {
  files: BatchImageItem[];
  format: string;
  quality?: number;
  resize?: ResizeOptions;
}

interface ImageProgressPayload {
  percentage: number;
  current_file?: string;
}

export type ImageConversionStatus = "idle" | "converting" | "done" | "error";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useImageConversion() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ImageConversionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    listen<ImageProgressPayload>("image_progress", (event) => {
      if (cancelled) return;
      const { percentage, current_file } = event.payload;
      setProgress(percentage);
      if (current_file !== undefined) setCurrentFile(current_file ?? null);
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unsubRef.current = unlisten;
    });
    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
  }, []);

  const convertImage = useCallback(
    async (params: ConvertImageParams): Promise<string> => {
      setStatus("converting");
      setProgress(0);
      setError(null);
      setResults(null);
      try {
        const result = await invoke<string>(
          "convert_image",
          params as unknown as Record<string, unknown>
        );
        setStatus("done");
        recordHistory({
          id: crypto.randomUUID(),
          file_name: fileNameFromPath(params.input_path),
          media_type: "image",
          source_format: extFromPath(params.input_path),
          target_format: extFromPath(params.output_path),
          output_path: params.output_path,
          timestamp: Date.now(),
          status: "success",
        });
        return result;
      } catch (e) {
        setError(String(e));
        setStatus("error");
        throw e;
      }
    },
    []
  );

  const convertImagesBatch = useCallback(
    async (params: ConvertBatchParams): Promise<BatchResult[]> => {
      setStatus("converting");
      setProgress(0);
      setError(null);
      setCurrentFile(null);
      setResults(null);
      try {
        const batchResults = await invoke<BatchResult[]>(
          "convert_images_batch",
          params as unknown as Record<string, unknown>
        );
        setStatus("done");
        setResults(batchResults);
        batchResults.filter((r) => r.success).forEach((r) =>
          recordHistory({
            id: crypto.randomUUID(),
            file_name: fileNameFromPath(r.input),
            media_type: "image",
            source_format: extFromPath(r.input),
            target_format: extFromPath(r.output),
            output_path: r.output,
            timestamp: Date.now(),
            status: "success",
          })
        );
        return batchResults;
      } catch (e) {
        setError(String(e));
        setStatus("error");
        throw e;
      }
    },
    []
  );

  const getImageInfo = useCallback(
    (path: string): Promise<ImageInfo> =>
      invoke<ImageInfo>("get_image_info", { input_path: path }),
    []
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setCurrentFile(null);
    setResults(null);
  }, []);

  return {
    progress,
    status,
    error,
    currentFile,
    results,
    convertImage,
    convertImagesBatch,
    getImageInfo,
    reset,
  };
}
