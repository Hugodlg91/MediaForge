import { invoke } from "@tauri-apps/api/core";
import type { ConflictStrategy, HwAcceleration } from "../hooks/useSettings";

// ─── Hardware acceleration ──────────────────────────────────────────────────

/**
 * Hardware encoders FFmpeg may expose, ordered by preference per family.
 * The first entry available on the machine wins.
 */
const HW_PRIORITY: Record<"h264" | "h265" | "vp9", string[]> = {
  h264: ["h264_nvenc", "h264_qsv", "h264_videotoolbox", "h264_amf"],
  h265: ["hevc_nvenc", "hevc_qsv", "hevc_videotoolbox", "hevc_amf"],
  vp9: ["vp9_qsv"],
};

let cachedEncoders: string[] | null = null;

/** Probe (once) the bundled FFmpeg for available hardware encoders. */
export async function detectHwEncoders(): Promise<string[]> {
  if (cachedEncoders) return cachedEncoders;
  try {
    cachedEncoders = await invoke<string[]>("detect_hw_encoders");
  } catch {
    cachedEncoders = [];
  }
  return cachedEncoders;
}

/**
 * Decide which FFmpeg encoder string to send for a given codec + acceleration
 * preference. Returns undefined when no codec was chosen (FFmpeg auto).
 *
 * - "software": always the software encoder (libx264 / libx265 / libvpx-vp9)
 * - "hardware" or "auto": pick the best available HW encoder, else fall back to software
 */
export function chooseVideoEncoder(
  codec: string | undefined,
  acceleration: HwAcceleration,
  available: string[]
): string | undefined {
  if (!codec) return undefined;
  const family = codec as "h264" | "h265" | "vp9";
  const candidates = HW_PRIORITY[family];
  if (acceleration !== "software" && candidates) {
    const hit = candidates.find((enc) => available.includes(enc));
    if (hit) return hit;
  }
  // Software fallback: the backend maps simple names to libx264/libx265/libvpx-vp9
  return codec;
}

// ─── Conflict resolution ────────────────────────────────────────────────────

/**
 * Apply the user's conflict strategy to a desired output path.
 * - "overwrite": returns the path unchanged (FFmpeg/-y overwrites)
 * - "rename": asks the backend for a free " (n)" variant if the file exists
 */
export async function resolveConflict(
  path: string,
  strategy: ConflictStrategy
): Promise<string> {
  if (strategy === "overwrite") return path;
  try {
    return await invoke<string>("unique_output_path", { path });
  } catch {
    return path;
  }
}
