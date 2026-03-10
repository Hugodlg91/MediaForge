import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import {
  useImageConversion,
  ImageInfo,
  BatchImageItem,
  ResizeOptions,
  BatchResult,
} from "../../hooks/useImageConversion";
import { buildOutputPath, formatFileSize } from "../../utils/path";
import { useSettingsContext } from "../../context/SettingsContext";
import { ProgressBar } from "./ProgressBar";
import { DropZone } from "../ui/DropZone";
import { ConversionResult } from "../ui/ConversionResult";

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_FORMATS = ["png", "jpg", "webp", "bmp", "tiff"] as const;
type ImageFormat = (typeof IMAGE_FORMATS)[number];

const QUALITY_FORMATS: ImageFormat[] = ["jpg", "webp"];

const ACCEPTED_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function BatchFileList({
  files,
  results,
  onRemove,
}: {
  files: string[];
  results: BatchResult[] | null;
  onRemove: (path: string) => void;
}) {
  const { t } = useTranslation();
  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
      {files.map((f) => {
        const name = f.split(/[\\/]/).pop() ?? f;
        const result = results?.find((r) => r.input === f);
        return (
          <div
            key={f}
            className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 gap-2"
          >
            <span className="text-xs text-gray-300 truncate flex-1">{name}</span>
            <div className="flex items-center gap-2 shrink-0">
              {result ? (
                result.success ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <span
                    className="text-red-400 text-xs"
                    title={result.error ?? t("converter.error")}
                  >
                    ✕
                  </span>
                )
              ) : (
                <button
                  onClick={() => onRemove(f)}
                  className="text-gray-500 hover:text-red-400 text-xs transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImageConverter() {
  const { t } = useTranslation();
  const { settings } = useSettingsContext();
  const {
    progress,
    status,
    error,
    currentFile,
    results,
    convertImage,
    convertImagesBatch,
    getImageInfo,
    reset,
  } = useImageConversion();

  // Mode
  const [mode, setMode] = useState<"single" | "batch">("single");

  // Single mode
  const [inputPath, setInputPath] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  // Batch mode
  const [batchFiles, setBatchFiles] = useState<string[]>([]);

  // Shared options
  const [outputFormat, setOutputFormat] = useState<ImageFormat>(
    (settings.default_image_format as ImageFormat) ?? "png"
  );
  const [quality, setQuality] = useState(85);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Resize
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);

  const isConverting = status === "converting";
  const isDone = status === "done";

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getResizeOptions = (): ResizeOptions | undefined => {
    if (!resizeEnabled) return undefined;
    const w = resizeWidth ? parseInt(resizeWidth, 10) : undefined;
    const h = resizeHeight ? parseInt(resizeHeight, 10) : undefined;
    if (!w && !h) return undefined;
    return { width: w, height: h, keep_aspect_ratio: keepAspectRatio };
  };

  const applyPreset = (preset: string) => {
    if (!imageInfo) return;
    switch (preset) {
      case "50%":
        setResizeWidth(String(Math.round(imageInfo.width * 0.5)));
        setResizeHeight(String(Math.round(imageInfo.height * 0.5)));
        setKeepAspectRatio(false);
        break;
      case "25%":
        setResizeWidth(String(Math.round(imageInfo.width * 0.25)));
        setResizeHeight(String(Math.round(imageInfo.height * 0.25)));
        setKeepAspectRatio(false);
        break;
      case "720p":
        setResizeWidth("");
        setResizeHeight("720");
        setKeepAspectRatio(true);
        break;
      case "1080p":
        setResizeWidth("");
        setResizeHeight("1080");
        setKeepAspectRatio(true);
        break;
      default:
        setResizeWidth("");
        setResizeHeight("");
    }
    setResizeEnabled(true);
  };

  const handleFormatChange = (fmt: ImageFormat) => {
    setOutputFormat(fmt);
    if (inputPath) setOutputPath(buildOutputPath(inputPath, fmt, settings.output_dir ?? undefined));
  };

  // ── File selection ─────────────────────────────────────────────────────────

  const handleSingleFileSelected = useCallback(
    async (path: string) => {
      setInputPath(path);
      setOutputPath(buildOutputPath(path, outputFormat, settings.output_dir ?? undefined));
      setPreviewSrc(convertFileSrc(path));
      reset();
      setImageInfo(null);
      try {
        const info = await getImageInfo(path);
        setImageInfo(info);
      } catch {
        // non-blocking
      }
    },
    [outputFormat, settings.output_dir, getImageInfo, reset]
  );

  const handleBatchFilesAdded = useCallback(
    (paths: string[]) => {
      setBatchFiles((prev) => {
        const set = new Set(prev);
        paths.forEach((p) => set.add(p));
        return Array.from(set);
      });
      reset();
    },
    [reset]
  );

  // ── Conversion ─────────────────────────────────────────────────────────────

  const handleConvertSingle = useCallback(async () => {
    if (!inputPath || !outputPath) return;
    await convertImage({
      input_path: inputPath,
      output_path: outputPath,
      format: outputFormat,
      quality: QUALITY_FORMATS.includes(outputFormat) ? quality : undefined,
      resize: getResizeOptions(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputPath, outputPath, outputFormat, quality, resizeEnabled, resizeWidth, resizeHeight, keepAspectRatio, convertImage]);

  const handleConvertBatch = useCallback(async () => {
    if (batchFiles.length === 0) return;
    const files: BatchImageItem[] = batchFiles.map((p) => ({
      input_path: p,
      output_path: buildOutputPath(p, outputFormat, settings.output_dir ?? undefined),
    }));
    await convertImagesBatch({
      files,
      format: outputFormat,
      quality: QUALITY_FORMATS.includes(outputFormat) ? quality : undefined,
      resize: getResizeOptions(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchFiles, outputFormat, quality, resizeEnabled, resizeWidth, resizeHeight, keepAspectRatio, convertImagesBatch]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 p-6 h-full overflow-y-auto">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-gray-100 text-xl font-bold tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            {t("nav.image")}
          </h2>
          <p className="text-[10px] text-gray-500 tracking-widest mt-0.5">100% LOCAL</p>
        </div>
        <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => { setMode("single"); reset(); }}
            className={`px-3 py-1.5 rounded-md transition-colors tracking-wider ${mode === "single" ? "bg-indigo-950 text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t("image.singleMode").toUpperCase()}
          </button>
          <button
            onClick={() => { setMode("batch"); reset(); }}
            className={`px-3 py-1.5 rounded-md transition-colors tracking-wider ${mode === "batch" ? "bg-indigo-950 text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t("image.batchMode").toUpperCase()}
          </button>
        </div>
      </div>

      {/* ── Single mode ──────────────────────────────────────────────────────── */}
      {mode === "single" && (
        <>
          <DropZone
            onFilesDropped={(files) => {
              const p = files[0];
              if (p) handleSingleFileSelected(p);
            }}
            allowedExtensions={ACCEPTED_EXTENSIONS}
            disabled={isConverting}
            hasFile={!!inputPath}
            className="flex gap-5 p-5"
          >
            {/* Preview thumbnail */}
            {previewSrc ? (
              <div className="shrink-0 w-28 h-28 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                <img
                  src={previewSrc}
                  alt="preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="shrink-0 w-28 h-28 rounded-lg bg-gray-800 flex items-center justify-center text-4xl">
                🖼️
              </div>
            )}

            {/* Info */}
            <div className="flex flex-col justify-center gap-1.5 min-w-0">
              {inputPath ? (
                <>
                  <p className="text-white text-sm font-medium truncate">
                    {inputPath.split(/[\\/]/).pop()}
                  </p>
                  {imageInfo && (
                    <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                      <span>📐 {imageInfo.width} × {imageInfo.height} px</span>
                      <span>🗂 {imageInfo.format.toUpperCase()}</span>
                      <span>💾 {formatFileSize(imageInfo.file_size)}</span>
                      {imageInfo.has_alpha && <span>✨ {t("image.fileInfo.hasAlpha")}</span>}
                    </div>
                  )}
                  {!isConverting && (
                    <span className="text-xs text-indigo-400 mt-1">{t("dropzone.fileLoaded")}</span>
                  )}
                </>
              ) : (
                <>
                  <p className="text-gray-300 text-sm font-medium">{t("dropzone.label")}</p>
                  <p className="text-gray-500 text-xs">
                    {t("converter.dropzone_sub", {
                      formats: IMAGE_FORMATS.join(", ").toUpperCase(),
                    })}
                  </p>
                </>
              )}
            </div>
          </DropZone>

          {/* Options (show only when file selected and not converting) */}
          {inputPath && !isConverting && !isDone && (
            <>
              {/* Format pills */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="text-[10px] text-gray-500 tracking-widest mb-3">
                  {t("converter.output_format").toUpperCase()}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {IMAGE_FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => handleFormatChange(f)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium tracking-wider transition-all border ${
                        outputFormat === f
                          ? "border-indigo-600 bg-indigo-950 text-indigo-400"
                          : "border-gray-700 text-gray-500 hover:border-indigo-600 hover:text-indigo-400"
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-2 text-indigo-400 text-xs w-fit hover:text-indigo-300 transition-colors tracking-wider"
              >
                <span className={`transition-transform text-[8px] ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
                {t("converter.advancedOptions").toUpperCase()}
              </button>

              {showAdvanced && (
                <div className="flex flex-col gap-4 bg-gray-900 rounded-xl p-4 border border-gray-700">
                  {/* Quality slider */}
                  {QUALITY_FORMATS.includes(outputFormat) && (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between">
                        <label className="text-gray-500 text-[10px] tracking-widest">
                          {t("image.quality").toUpperCase()}
                        </label>
                        <span className="text-indigo-400 text-xs font-medium">{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  )}

                  {/* Resize */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        role="checkbox"
                        aria-checked={resizeEnabled}
                        onClick={() => setResizeEnabled((v) => !v)}
                        className={`w-10 h-5 rounded-full transition-colors shrink-0 ${resizeEnabled ? "bg-indigo-600" : "bg-gray-700"}`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${resizeEnabled ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                      <label
                        className="text-gray-300 text-xs cursor-pointer tracking-wider"
                        onClick={() => setResizeEnabled((v) => !v)}
                      >
                        {t("image.resize").toUpperCase()}
                      </label>
                    </div>

                    {resizeEnabled && (
                      <div className="flex flex-col gap-3 ml-13 pl-1">
                        <div className="flex flex-wrap gap-1.5">
                          {["Original", "50%", "25%", "720p", "1080p"].map((p) => (
                            <button
                              key={p}
                              onClick={() =>
                                p === "Original"
                                  ? (setResizeWidth(""), setResizeHeight(""), setResizeEnabled(false))
                                  : applyPreset(p)
                              }
                              className="px-2.5 py-1 text-[11px] border border-gray-700 hover:border-indigo-600 hover:text-indigo-400 text-gray-500 rounded-md transition-colors tracking-wider"
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex flex-col gap-1">
                            <label className="text-gray-500 text-[10px] tracking-widest">{t("image.width").toUpperCase()}</label>
                            <input
                              type="number" min={1} value={resizeWidth}
                              onChange={(e) => setResizeWidth(e.target.value)}
                              placeholder="px"
                              className="w-24 bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                          <span className="text-gray-600 mt-4">×</span>
                          <div className="flex flex-col gap-1">
                            <label className="text-gray-500 text-[10px] tracking-widest">{t("image.height").toUpperCase()}</label>
                            <input
                              type="number" min={1} value={resizeHeight}
                              onChange={(e) => setResizeHeight(e.target.value)}
                              placeholder="px"
                              className="w-24 bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            role="checkbox"
                            aria-checked={keepAspectRatio}
                            onClick={() => setKeepAspectRatio((v) => !v)}
                            className={`w-10 h-5 rounded-full transition-colors shrink-0 ${keepAspectRatio ? "bg-indigo-600" : "bg-gray-700"}`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full mx-0.5 transition-transform ${keepAspectRatio ? "translate-x-5" : "translate-x-0"}`}
                            />
                          </button>
                          <label
                            className="text-gray-300 text-xs cursor-pointer tracking-wider"
                            onClick={() => setKeepAspectRatio((v) => !v)}
                          >
                            {t("image.keepAspectRatio").toUpperCase()}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleConvertSingle}
                className="w-full py-3 bg-indigo-600 hover:opacity-90 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all tracking-widest"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {t("converter.convert").toUpperCase()}
              </button>
            </>
          )}

          {/* Progress */}
          {isConverting && <ProgressBar progress={progress} />}

          {/* Done */}
          {isDone && outputPath && (
            <ConversionResult
              outputPath={outputPath}
              onNewConversion={() => {
                reset();
                setInputPath(null);
                setImageInfo(null);
                setPreviewSrc(null);
              }}
            />
          )}
        </>
      )}

      {/* ── Batch mode ───────────────────────────────────────────────────────── */}
      {mode === "batch" && (
        <>
          {/* Drop zone for adding files */}
          {!isConverting && !isDone && (
            <DropZone
              onFilesDropped={handleBatchFilesAdded}
              allowedExtensions={ACCEPTED_EXTENSIONS}
              multiple={true}
            >
              <span className="text-2xl">🖼️</span>
              <span className="text-gray-400 text-sm">{t("image.selectImages")}</span>
              <span className="text-xs text-indigo-400">{t("dropzone.browse")}</span>
            </DropZone>
          )}

          {/* File list */}
          <BatchFileList
            files={batchFiles}
            results={results}
            onRemove={(p) => setBatchFiles((prev) => prev.filter((f) => f !== p))}
          />

          {/* Options */}
          {batchFiles.length > 0 && !isConverting && !isDone && (
            <>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="text-[10px] text-gray-500 tracking-widest mb-3">
                  {t("converter.output_format").toUpperCase()}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {IMAGE_FORMATS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setOutputFormat(f)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium tracking-wider transition-all border ${
                        outputFormat === f
                          ? "border-indigo-600 bg-indigo-950 text-indigo-400"
                          : "border-gray-700 text-gray-500 hover:border-indigo-600 hover:text-indigo-400"
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {QUALITY_FORMATS.includes(outputFormat) && (
                <div className="flex items-center gap-4">
                  <label className="text-gray-500 text-[10px] tracking-widest shrink-0">
                    {t("image.quality").toUpperCase()} : <span className="text-indigo-400">{quality}%</span>
                  </label>
                  <input
                    type="range" min={1} max={100} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                </div>
              )}

              <button
                onClick={handleConvertBatch}
                className="w-full py-3 bg-indigo-600 hover:opacity-90 active:scale-[0.99] text-white font-bold text-xs rounded-xl transition-all tracking-widest"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                {t("converter.convert").toUpperCase()} ({batchFiles.length})
              </button>
            </>
          )}

          {/* Progress */}
          {isConverting && (
            <ProgressBar progress={progress} currentFile={currentFile ?? undefined} />
          )}

          {/* Batch done */}
          {isDone && results && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400 font-medium">
                  ✓ {t("image.batchSuccess", { count: results.filter((r) => r.success).length })}
                </span>
                {results.some((r) => !r.success) && (
                  <span className="text-red-400">
                    ✕ {t("image.batchErrors", { count: results.filter((r) => !r.success).length })}
                  </span>
                )}
              </div>
              <BatchFileList files={batchFiles} results={results} onRemove={() => {}} />
              <div className="flex gap-3 flex-wrap">
                {results.some((r) => r.success) && (
                  <button
                    onClick={async () => {
                      const first = results.find((r) => r.success);
                      if (first) {
                        await invoke("open_folder", {
                          filePath: first.output,
                        } as unknown as Record<string, unknown>);
                      }
                    }}
                    className="px-4 py-2 border border-gray-700 hover:border-gray-600 text-gray-300 text-xs rounded-lg transition-colors tracking-wider"
                  >
                    {t("result.openFolder").toUpperCase()}
                  </button>
                )}
                <button
                  onClick={() => { reset(); setBatchFiles([]); }}
                  className="px-4 py-2 bg-indigo-600 hover:opacity-90 text-white text-xs rounded-lg transition-all tracking-wider font-bold"
                  style={{ fontFamily: "'Syne', sans-serif" }}
                >
                  {t("result.newConversion").toUpperCase()}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Error (both modes) ───────────────────────────────────────────────── */}
      {status === "error" && error && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900 rounded-lg p-3">
          <span>✕</span>
          <span>{t("converter.error")}: {error}</span>
        </div>
      )}
    </div>
  );
}
