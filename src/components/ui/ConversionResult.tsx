import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface ConversionResultProps {
  outputPath: string;
  onNewConversion: () => void;
}

export function ConversionResult({ outputPath, onNewConversion }: ConversionResultProps) {
  const { t } = useTranslation();

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
      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
        <span>✓</span>
        <span>{t("result.success")}</span>
      </div>
      <p className="text-gray-400 text-xs break-all">{outputPath}</p>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleOpenFolder}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
        >
          {t("result.openFolder")}
        </button>
        <button
          onClick={onNewConversion}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          {t("result.newConversion")}
        </button>
      </div>
    </div>
  );
}
