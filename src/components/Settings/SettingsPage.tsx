import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettingsContext } from "../../context/SettingsContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
  { code: "pt", label: "Português",flag: "🇵🇹" },
];

const VIDEO_FORMATS = ["mp4", "mkv", "avi", "mov", "webm"];
const AUDIO_FORMATS = ["mp3", "flac", "wav", "ogg", "aac", "m4a"];
const IMAGE_FORMATS = ["png", "jpg", "webp", "bmp", "tiff"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 bg-gray-900 rounded-xl p-5 border border-gray-800">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <label className="text-gray-300 text-sm shrink-0">{label}</label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsPage() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsContext();
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("0.1.0"));
  }, []);

  const handlePickFolder = async () => {
    const result = await open({ directory: true, multiple: false });
    if (typeof result === "string") {
      await updateSettings({ output_dir: result });
    }
  };

  const selectClass =
    "bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500";

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      <h2 className="text-white text-xl font-semibold">{t("settings.title")}</h2>

      <div className="flex flex-col gap-4 max-w-lg">

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.appearance")}>
          <SettingRow label={t("settings.theme")}>
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => updateSettings({ theme: "dark" })}
                className={`px-4 py-1.5 text-sm transition-colors ${
                  settings.theme === "dark"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                🌙 {t("settings.themeDark")}
              </button>
              <button
                onClick={() => updateSettings({ theme: "light" })}
                className={`px-4 py-1.5 text-sm transition-colors ${
                  settings.theme === "light"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                ☀️ {t("settings.themeLight")}
              </button>
            </div>
          </SettingRow>

          <SettingRow label={t("settings.language")}>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className={selectClass}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </SettingRow>
        </SectionCard>

        {/* ── Conversion ──────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.conversion")}>
          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm">{t("settings.outputDir")}</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={settings.output_dir ?? ""}
                placeholder={t("settings.outputDirDefault")}
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 text-gray-300 placeholder-gray-600 text-sm rounded-lg px-3 py-2 focus:outline-none truncate"
              />
              <button
                onClick={handlePickFolder}
                className="shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                {t("settings.chooseFolder")}
              </button>
              {settings.output_dir && (
                <button
                  onClick={() => updateSettings({ output_dir: null })}
                  className="shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-red-400 text-sm rounded-lg transition-colors"
                >
                  {t("settings.reset")}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm">{t("settings.defaultFormats")}</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-xs">{t("settings.defaultVideo")}</span>
                <select
                  value={settings.default_video_format}
                  onChange={(e) => updateSettings({ default_video_format: e.target.value })}
                  className={selectClass}
                >
                  {VIDEO_FORMATS.map((f) => (
                    <option key={f} value={f}>{f.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-xs">{t("settings.defaultAudio")}</span>
                <select
                  value={settings.default_audio_format}
                  onChange={(e) => updateSettings({ default_audio_format: e.target.value })}
                  className={selectClass}
                >
                  {AUDIO_FORMATS.map((f) => (
                    <option key={f} value={f}>{f.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-xs">{t("settings.defaultImage")}</span>
                <select
                  value={settings.default_image_format}
                  onChange={(e) => updateSettings({ default_image_format: e.target.value })}
                  className={selectClass}
                >
                  {IMAGE_FORMATS.map((f) => (
                    <option key={f} value={f}>{f.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.about")}>
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">MediaForge</span>
            {version && (
              <span className="text-gray-500 text-xs">
                {t("settings.version")} {version}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs">{t("settings.localOnly")}</p>
        </SectionCard>

      </div>
    </div>
  );
}
