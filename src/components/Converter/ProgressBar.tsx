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
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{currentFile ?? currentTime ?? "—"}</span>
        <div className="flex gap-3">
          {speed && <span>{speed}</span>}
          <span className="text-white font-medium">{pct}%</span>
        </div>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-fit mt-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
        >
          {t("converter.cancel")}
        </button>
      )}
    </div>
  );
}
