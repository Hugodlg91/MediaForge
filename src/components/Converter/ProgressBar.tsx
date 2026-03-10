import { useTranslation } from "react-i18next";

interface ProgressBarProps {
  progress: number;
  currentTime?: string;
  speed?: string;
  /** File name shown during batch processing */
  currentFile?: string;
  /** If provided, shows a cancel button */
  onCancel?: () => void;
}

export function ProgressBar({
  progress,
  currentTime,
  speed,
  currentFile,
  onCancel,
}: ProgressBarProps) {
  const { t } = useTranslation();
  const pct = Math.round(progress);

  return (
    <div className="flex flex-col gap-2 bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex justify-between text-xs text-gray-400">
        <span className="truncate max-w-xs">{currentFile ?? currentTime ?? "—"}</span>
        <div className="flex gap-3 shrink-0">
          {speed && <span>{speed}</span>}
          <span className="text-indigo-400 font-medium">{pct}%</span>
        </div>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-150 animate-progress-glow"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #7c6aff, #a099ff)",
          }}
        />
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-fit mt-1 px-4 py-1.5 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-200 text-xs rounded-lg transition-colors tracking-wider"
        >
          {t("converter.cancel").toUpperCase()}
        </button>
      )}
    </div>
  );
}
