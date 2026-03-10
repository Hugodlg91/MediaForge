import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface UseDragDropReturn {
  isDragging: boolean;
  droppedFiles: string[];
  bind: (allowedExtensions: string[]) => void;
  reset: () => void;
}

export function useDragDrop(): UseDragDropReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<string[]>([]);
  const allowedExtRef = useRef<string[]>([]);

  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await win.onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === "over") {
          setIsDragging(true);
        } else if (payload.type === "drop") {
          setIsDragging(false);
          const paths: string[] = payload.paths;
          const exts = allowedExtRef.current;
          const filtered =
            exts.length === 0
              ? paths
              : paths.filter((p) => {
                  const ext = p.split(".").pop()?.toLowerCase() ?? "";
                  return exts.includes(ext);
                });
          if (filtered.length > 0) {
            setDroppedFiles(filtered);
          }
        } else if (payload.type === "leave") {
          setIsDragging(false);
        }
      });
    };

    setup();
    return () => {
      unlisten?.();
    };
  }, []);

  const bind = useCallback((extensions: string[]) => {
    allowedExtRef.current = extensions;
  }, []);

  const reset = useCallback(() => {
    setDroppedFiles([]);
    setIsDragging(false);
  }, []);

  return { isDragging, droppedFiles, bind, reset };
}
