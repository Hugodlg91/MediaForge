import { describe, it, expect } from "vitest";
import {
    buildOutputPath,
    formatFileSize,
    formatDuration,
} from "../utils/path";

// ─── buildOutputPath ──────────────────────────────────────────────────────────

describe("buildOutputPath", () => {
    it("appends _converted and swaps extension (forward slashes)", () => {
        expect(buildOutputPath("/home/user/video.mp4", "mkv")).toBe(
            "/home/user/video_converted.mkv"
        );
    });

    it("handles Windows backslash separators", () => {
        expect(buildOutputPath("C:\\Users\\Hugo\\clip.mov", "mp4")).toBe(
            "C:/Users/Hugo/clip_converted.mp4"
        );
    });

    it("uses destFolder when provided", () => {
        expect(buildOutputPath("/src/audio.wav", "mp3", "/output")).toBe(
            "/output/audio_converted.mp3"
        );
    });

    it("strips trailing slash from destFolder", () => {
        expect(buildOutputPath("/src/img.png", "jpg", "/out/")).toBe(
            "/out/img_converted.jpg"
        );
    });

    it("handles a file with no directory prefix", () => {
        expect(buildOutputPath("photo.png", "webp")).toBe(
            "./photo_converted.webp"
        );
    });

    it("handles a file with multiple dots in name", () => {
        expect(buildOutputPath("/tmp/my.great.video.mp4", "mkv")).toBe(
            "/tmp/my.great.video_converted.mkv"
        );
    });
});

// ─── formatFileSize ───────────────────────────────────────────────────────────

describe("formatFileSize", () => {
    it("formats bytes", () => {
        expect(formatFileSize(512)).toBe("512 B");
    });

    it("formats kilobytes", () => {
        expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("formats megabytes", () => {
        expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
    });

    it("formats gigabytes", () => {
        expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe("1.50 GB");
    });

    it("formats exactly 1 KB", () => {
        expect(formatFileSize(1024)).toBe("1.0 KB");
    });
});

// ─── formatDuration ───────────────────────────────────────────────────────────

describe("formatDuration", () => {
    it("formats seconds only", () => {
        expect(formatDuration(45)).toBe("0:45");
    });

    it("formats minutes and seconds", () => {
        expect(formatDuration(90)).toBe("1:30");
    });

    it("pads seconds with leading zero", () => {
        expect(formatDuration(65)).toBe("1:05");
    });

    it("formats hours:minutes:seconds when >= 1 hour", () => {
        expect(formatDuration(3661)).toBe("1:01:01");
    });

    it("handles zero duration", () => {
        expect(formatDuration(0)).toBe("0:00");
    });
});
