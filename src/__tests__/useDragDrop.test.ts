import { describe, it, expect } from "vitest";

/**
 * The extension-filtering logic from useDragDrop is tested here in isolation
 * (without the Tauri runtime). We extract and replicate the pure predicate so
 * it can be unit-tested without mocking the entire Tauri window API.
 */

// The exact filter predicate used inside useDragDrop
function filterByExtension(paths: string[], allowedExts: string[]): string[] {
    if (allowedExts.length === 0) return paths;
    return paths.filter((p) => {
        const ext = p.split(".").pop()?.toLowerCase() ?? "";
        return allowedExts.includes(ext);
    });
}

describe("filterByExtension (useDragDrop logic)", () => {
    const files = [
        "/home/user/video.mp4",
        "/home/user/audio.MP3",
        "/home/user/image.PNG",
        "/home/user/doc.pdf",
        "/home/user/no_extension",
    ];

    it("allows all files when allowedExts is empty", () => {
        expect(filterByExtension(files, [])).toEqual(files);
    });

    it("filters to only mp4 files", () => {
        expect(filterByExtension(files, ["mp4"])).toEqual(["/home/user/video.mp4"]);
    });

    it("is case-insensitive (handles .MP3 as 'mp3')", () => {
        expect(filterByExtension(files, ["mp3"])).toEqual(["/home/user/audio.MP3"]);
    });

    it("handles multiple allowed extensions", () => {
        const result = filterByExtension(files, ["mp4", "mp3", "png"]);
        expect(result).toEqual([
            "/home/user/video.mp4",
            "/home/user/audio.MP3",
            "/home/user/image.PNG",
        ]);
    });

    it("excludes files with no extension", () => {
        expect(filterByExtension(files, ["mp4"])).not.toContain(
            "/home/user/no_extension"
        );
    });

    it("returns empty array when nothing matches", () => {
        expect(filterByExtension(files, ["avi"])).toEqual([]);
    });

    it("handles Windows paths with backslashes", () => {
        const winFiles = ["C:\\Users\\Hugo\\clip.AVI", "C:\\Users\\Hugo\\photo.jpg"];
        // backslash paths: split(".") still finds extension after last dot
        expect(filterByExtension(winFiles, ["avi"])).toEqual([
            "C:\\Users\\Hugo\\clip.AVI",
        ]);
    });
});
