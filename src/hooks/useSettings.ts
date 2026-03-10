import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import i18n from "../i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  language: string;
  theme: "dark" | "light";
  output_dir: string | null;
  default_video_format: string;
  default_audio_format: string;
  default_image_format: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  theme: "dark",
  output_dir: null,
  default_video_format: "mp4",
  default_audio_format: "mp3",
  default_image_format: "webp",
};

// ─── Theme helper ─────────────────────────────────────────────────────────────

function applyTheme(theme: "dark" | "light") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  // Mirror to localStorage so the flash-prevention script can use it
  localStorage.setItem("mf-theme", theme);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then((s) => {
        setSettings(s);
        applyTheme(s.theme);
        i18n.changeLanguage(s.language);
      })
      .catch(() => {
        // Use defaults if store unavailable; still apply default theme
        applyTheme(DEFAULT_SETTINGS.theme);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      const next = { ...settings, ...partial } as AppSettings;
      setSettings(next);
      if (partial.theme !== undefined) applyTheme(partial.theme);
      if (partial.language !== undefined) i18n.changeLanguage(partial.language);
      await invoke("save_settings", {
        settings: next,
      } as unknown as Record<string, unknown>);
    },
    [settings]
  );

  return { settings, updateSettings, isLoading };
}
