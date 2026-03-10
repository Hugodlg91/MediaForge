import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { useDragDrop } from "../../hooks/useDragDrop";

interface DropZoneProps {
  onFilesDropped: (files: string[]) => void;
  allowedExtensions: string[];
  multiple?: boolean;
  label?: string;
  disabled?: boolean;
  hasFile?: boolean;
  /** Override the inner layout classes (default: centered column with padding) */
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({
  onFilesDropped,
  allowedExtensions,
  multiple = false,
  label,
  disabled = false,
  hasFile = false,
  className,
  children,
}: DropZoneProps) {
  const { t } = useTranslation();
  const { isDragging, droppedFiles, bind, reset } = useDragDrop();

  // Update allowed extensions ref without recreating the event listener
  useEffect(() => {
    bind(allowedExtensions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bind]);

  // Forward dropped files to parent
  useEffect(() => {
    if (droppedFiles.length > 0) {
      onFilesDropped(multiple ? droppedFiles : [droppedFiles[0]]);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [droppedFiles]);

  const handleClick = async () => {
    if (disabled) return;
    const selected = await open({
      multiple,
      filters: [{ name: label ?? "Files", extensions: allowedExtensions }],
    });
    if (!selected) return;
    const files = Array.isArray(selected) ? selected : [selected];
    if (files.length > 0) onFilesDropped(files);
  };

  const borderColor = isDragging
    ? "border-indigo-400 bg-indigo-950/40"
    : hasFile
    ? "border-indigo-600 bg-indigo-950/20"
    : "border-gray-700 hover:border-indigo-500 hover:bg-indigo-950/10";

  return (
    <div
      onClick={!disabled ? handleClick : undefined}
      className={`border border-dashed rounded-xl transition-all duration-200 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${borderColor} ${
        className ?? "flex flex-col items-center justify-center p-8 gap-3"
      }`}
    >
      {children ?? (
        <>
          <p className="text-gray-300 text-sm font-medium">
            {label ?? t("dropzone.label")}
          </p>
          <p className="text-gray-500 text-xs">{t("dropzone.or")}</p>
          <span className="text-xs text-indigo-400">{t("dropzone.browse")}</span>
        </>
      )}
    </div>
  );
}
