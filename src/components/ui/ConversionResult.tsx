import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { IcnCheck, IcnFolder } from "./Icons";

interface ConversionResultProps {
  outputPath: string;
  onNewConversion: () => void;
}

export function ConversionResult({ outputPath, onNewConversion }: ConversionResultProps) {
  const { t } = useTranslation();
  const fileName = outputPath.split(/[\/]/).pop() ?? outputPath;

  const handleOpenFolder = useCallback(async () => {
    try {
      await invoke("open_folder", { filePath: outputPath } as unknown as Record<string, unknown>);
    } catch (e) {
      console.error("open_folder error:", e);
    }
  }, [outputPath]);

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Success card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(16, 185, 129, 0.06)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: "12px",
          padding: "14px 16px",
        }}
      >
        {/* Check icon */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--success)",
          }}
        >
          <IcnCheck size={16} strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--success)", letterSpacing: "0.06em", marginBottom: "2px" }}>
            {t("result.success").toUpperCase()}
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-sub)" }} className="truncate" title={outputPath}>
            {fileName}
          </p>
        </div>

        <button className="btn-ghost" onClick={handleOpenFolder} style={{ flexShrink: 0, gap: "6px" }}>
          <IcnFolder size={14} />
          {t("result.openFolder")}
        </button>
      </div>

      <button className="btn-primary" onClick={onNewConversion} style={{ width: "fit-content" }}>
        {t("result.newConversion")}
      </button>
    </div>
  );
}
