import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, useEffect, useRef, useCallback } from "react";
import type { HistoryItem } from "./useHistory";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaInfo {
  duration: number;
  width?: number;
  height?: number;
  video_codec?: string;
  audio_codec?: string;
  file_size: number;
  bitrate?: string;
}

export interface VideoConvertParams {
  input_path: string;
  output_path: string;
  resolution?: string;
  codec?: string;
  bitrate?: string;
}

export interface AudioConvertParams {
  input_path: string;
  output_path: string;
  bitrate?: string;
  sample_rate?: string;
  normalize?: boolean;
}

export interface BatchMediaItem {
  input_path: string;
  output_path: string;
}

export interface BatchResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
}

export interface BatchVideoParams {
  files: BatchMediaItem[];
  resolution?: string;
  codec?: string;
  bitrate?: string;
}

export interface BatchAudioParams {
  files: BatchMediaItem[];
  bitrate?: string;
  sample_rate?: string;
  normalize?: boolean;
}

interface ProgressPayload {
  percentage: number;
  current_time: string;
  speed: string;
}

interface BatchProgressPayload {
  index: number;
  total: number;
  current_file: string;
  percentage: number;
}

export type ConversionStatus = "idle" | "converting" | "done" | "error";

// ─── History helper ───────────────────────────────────────────────────────────

function recordHistory(item: HistoryItem) {
  // Fire-and-forget: never block the UI on history persistence
  invoke("add_history_item", { item } as unknown as Record<string, unknown>).catch(
    () => { /* ignore */ }
  );
}

function fileNameFromPath(p: string): string {
  return p.replace(/\\/g, "/").split("/").pop() ?? p;
}

function extFromPath(p: string): string {
  const parts = fileNameFromPath(p).split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConversion() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ConversionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  // Batch-specific state
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  // Prevents single-file "conversion_progress" from overwriting batch progress
  const isBatchRef = useRef(false);

  const unsubRef = useRef<(() => void) | null>(null);
  const batchUnsubRef = useRef<(() => void) | null>(null);

  // Listen to single-file FFmpeg progress
  useEffect(() => {
    let cancel = false;
    listen<ProgressPayload>("conversion_progress", (event) => {
      if (cancel || isBatchRef.current) return;
      const { percentage, speed, current_time } = event.payload;
      setProgress(percentage);
      if (speed) setSpeed(speed);
      if (current_time) setCurrentTime(current_time);
    }).then((unlisten) => {
      if (cancel) unlisten();
      else unsubRef.current = unlisten;
    });
    return () => {
      cancel = true;
      unsubRef.current?.();
    };
  }, []);

  // Listen to batch progress
  useEffect(() => {
    let cancel = false;
    listen<BatchProgressPayload>("batch_progress", (event) => {
      if (cancel) return;
      const { percentage, current_file, index, total } = event.payload;
      setProgress(percentage);
      setCurrentFile(current_file || null);
      setBatchIndex(index);
      setBatchTotal(total);
    }).then((unlisten) => {
      if (cancel) unlisten();
      else batchUnsubRef.current = unlisten;
    });
    return () => {
      cancel = true;
      batchUnsubRef.current?.();
    };
  }, []);

  // ── Single-file commands ───────────────────────────────────────────────────

  const convertVideo = useCallback(async (params: VideoConvertParams): Promise<string> => {
    setStatus("converting");
    setProgress(0);
    setError(null);
    setSpeed("");
    setCurrentTime("");
    try {
      const result = await invoke<string>("convert_video", params as unknown as Record<string, unknown>);
      setStatus("done");
      recordHistory({
        id: crypto.randomUUID(),
        file_name: fileNameFromPath(params.input_path),
        media_type: "video",
        source_format: extFromPath(params.input_path),
        target_format: extFromPath(params.output_path),
        output_path: params.output_path,
        timestamp: Date.now(),
        status: "success",
      });
      return result;
    } catch (e) {
      const msg = String(e);
      if (msg !== "cancelled") {
        setError(msg);
        setStatus("error");
      } else {
        setStatus("idle");
      }
      throw e;
    }
  }, []);

  const convertAudio = useCallback(async (params: AudioConvertParams): Promise<string> => {
    setStatus("converting");
    setProgress(0);
    setError(null);
    setSpeed("");
    setCurrentTime("");
    try {
      const result = await invoke<string>("convert_audio", params as unknown as Record<string, unknown>);
      setStatus("done");
      recordHistory({
        id: crypto.randomUUID(),
        file_name: fileNameFromPath(params.input_path),
        media_type: "audio",
        source_format: extFromPath(params.input_path),
        target_format: extFromPath(params.output_path),
        output_path: params.output_path,
        timestamp: Date.now(),
        status: "success",
      });
      return result;
    } catch (e) {
      const msg = String(e);
      if (msg !== "cancelled") {
        setError(msg);
        setStatus("error");
      } else {
        setStatus("idle");
      }
      throw e;
    }
  }, []);

  // ── Batch commands ─────────────────────────────────────────────────────────

  const convertVideoBatch = useCallback(async (params: BatchVideoParams): Promise<BatchResult[]> => {
    setStatus("converting");
    setProgress(0);
    setError(null);
    setResults(null);
    setBatchIndex(0);
    setBatchTotal(params.files.length);
    setCurrentFile(null);
    isBatchRef.current = true;
    try {
      const res = await invoke<BatchResult[]>(
        "convert_video_batch",
        params as unknown as Record<string, unknown>
      );
      setResults(res);
      setStatus("done");
      res.filter((r) => r.success).forEach((r) =>
        recordHistory({
          id: crypto.randomUUID(),
          file_name: fileNameFromPath(r.input),
          media_type: "video",
          source_format: extFromPath(r.input),
          target_format: extFromPath(r.output),
          output_path: r.output,
          timestamp: Date.now(),
          status: "success",
        })
      );
      return res;
    } catch (e) {
      const msg = String(e);
      if (msg !== "cancelled") {
        setError(msg);
        setStatus("error");
      } else {
        setStatus("idle");
      }
      throw e;
    } finally {
      isBatchRef.current = false;
    }
  }, []);

  const convertAudioBatch = useCallback(async (params: BatchAudioParams): Promise<BatchResult[]> => {
    setStatus("converting");
    setProgress(0);
    setError(null);
    setResults(null);
    setBatchIndex(0);
    setBatchTotal(params.files.length);
    setCurrentFile(null);
    isBatchRef.current = true;
    try {
      const res = await invoke<BatchResult[]>(
        "convert_audio_batch",
        params as unknown as Record<string, unknown>
      );
      setResults(res);
      setStatus("done");
      res.filter((r) => r.success).forEach((r) =>
        recordHistory({
          id: crypto.randomUUID(),
          file_name: fileNameFromPath(r.input),
          media_type: "audio",
          source_format: extFromPath(r.input),
          target_format: extFromPath(r.output),
          output_path: r.output,
          timestamp: Date.now(),
          status: "success",
        })
      );
      return res;
    } catch (e) {
      const msg = String(e);
      if (msg !== "cancelled") {
        setError(msg);
        setStatus("error");
      } else {
        setStatus("idle");
      }
      throw e;
    } finally {
      isBatchRef.current = false;
    }
  }, []);

  // ── Shared utilities ───────────────────────────────────────────────────────

  const getMediaInfo = useCallback(
    (path: string): Promise<MediaInfo> =>
      invoke<MediaInfo>("get_media_info", { input_path: path }),
    []
  );

  const cancel = useCallback(async () => {
    await invoke("cancel_conversion");
    setStatus("idle");
    setProgress(0);
    setSpeed("");
    setCurrentTime("");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setSpeed("");
    setCurrentTime("");
    setResults(null);
    setBatchIndex(0);
    setBatchTotal(0);
    setCurrentFile(null);
    isBatchRef.current = false;
  }, []);

  return {
    progress,
    status,
    error,
    speed,
    currentTime,
    results,
    batchIndex,
    batchTotal,
    currentFile,
    convertVideo,
    convertAudio,
    convertVideoBatch,
    convertAudioBatch,
    getMediaInfo,
    cancel,
    reset,
  };
}
