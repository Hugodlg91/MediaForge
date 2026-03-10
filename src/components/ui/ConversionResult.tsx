import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface ConversionResultProps {
  outputPath: string;
  onNewConversion: () => void;
}

export function ConversionResult({ outputPath, onNewConversion }: ConversionResultProps) {
  const { t } = useTranslation();
  const fileName = outputPath.split(/[\\/]/).pop() ?? outputPath;

  const handleOpenFolder = useCallback(async () => {
    try {
      await invoke("open_folder", {
        filePath: outputPath,
      } as unknown as Record<string, unknown>);
    } catch (e) {
      console.error("open_folder error:", e);
    }
  }, [outputPath]);

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <div className="flex items-center justify-between bg-green-950/30 border border-green-900/50 rounded-xl p-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-green-400 font-bold tracking-widest mb-1">
            {t("result.success").toUpperCase()}
          </div>
          <p className="text-gray-400 text-xs truncate" title={outputPath}>{fileName}</p>
        </div>
        <button
          onClick={handleOpenFolder}
          className="shrink-0 ml-4 px-3 py-1.5 border border-gray-700 hover:border-gray-600 text-gray-300 text-[10px] rounded-lg transition-colors tracking-wider"
        >
          {t("result.openFolder").toUpperCase()}
        </button>
      </div>
      <button
        onClick={onNewConversion}
        className="w-fit px-5 py-2 bg-indigo-600 hover:opacity-90 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all tracking-wider"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        {t("result.newConversion").toUpperCase()}
      </button>
    </div>
  );
}
