import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useCallback } from "react";

export type PresetMediaType = "image" | "video" | "audio";

export interface Preset {
  id: string;
  name: string;
  media_type: PresetMediaType;
  settings: Record<string, unknown>;
}

/**
 * Persisted, named conversion presets scoped to a media type.
 * Backed by the Rust presets.json store (get/save/delete commands).
 */
export function usePresets(mediaType: PresetMediaType) {
  const [presets, setPresets] = useState<Preset[]>([]);

  const refresh = useCallback(async () => {
    try {
      const all = await invoke<Preset[]>("get_presets");
      setPresets(all.filter((p) => p.media_type === mediaType));
    } catch {
      setPresets([]);
    }
  }, [mediaType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savePreset = useCallback(
    async (name: string, settings: Record<string, unknown>) => {
      const preset: Preset = {
        id: crypto.randomUUID(),
        name,
        media_type: mediaType,
        settings,
      };
      await invoke("save_preset", { preset } as unknown as Record<string, unknown>);
      await refresh();
    },
    [mediaType, refresh]
  );

  const deletePreset = useCallback(
    async (id: string) => {
      await invoke("delete_preset", { id });
      await refresh();
    },
    [refresh]
  );

  return { presets, savePreset, deletePreset, refresh };
}
