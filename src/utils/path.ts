/**
 * Build the output path from an input path, a new extension, and an optional
 * destination folder.
 *
 * Examples:
 *   buildOutputPath("/home/user/video.mp4", "mkv")
 *     → "/home/user/video_converted.mkv"
 *   buildOutputPath("/home/user/video.mp4", "mkv", "/tmp/out")
 *     → "/tmp/out/video_converted.mkv"
 */
export function buildOutputPath(
  inputPath: string,
  extension: string,
  destFolder?: string
): string {
  // Normalise separators to forward-slash
  const normalised = inputPath.replace(/\\/g, "/");
  const dirPart = normalised.includes("/")
    ? normalised.substring(0, normalised.lastIndexOf("/"))
    : ".";
  const fileName = normalised.includes("/")
    ? normalised.substring(normalised.lastIndexOf("/") + 1)
    : normalised;
  const nameWithoutExt = fileName.includes(".")
    ? fileName.substring(0, fileName.lastIndexOf("."))
    : fileName;

  const dir = destFolder ? destFolder.replace(/\\/g, "/").replace(/\/$/, "") : dirPart;
  return `${dir}/${nameWithoutExt}_converted.${extension}`;
}

/** Format bytes as a human-readable string (KB, MB, GB). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Format a duration in seconds as "mm:ss" or "hh:mm:ss". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
