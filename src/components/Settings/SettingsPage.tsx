import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettingsContext } from "../../context/SettingsContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES: { code: string; label: string; display: string }[] = [
  { code: "fr", label: "FR", display: "Francais" },
  { code: "en", label: "EN", display: "English" },
  { code: "es", label: "ES", display: "Espanol" },
  { code: "de", label: "DE", display: "Deutsch" },
  { code: "pt", label: "PT", display: "Portugues" },
];

const VIDEO_FORMATS = ["mp4", "mkv", "avi", "mov", "webm"];
const AUDIO_FORMATS = ["mp3", "flac", "wav", "ogg", "aac", "m4a"];
const IMAGE_FORMATS = ["png", "jpg", "webp", "bmp", "tiff"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <h3
        style={{
          fontSize: "10px",
          color: "var(--muted)",
          letterSpacing: "0.1em",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: "2px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
      <label style={{ fontSize: "12px", color: "var(--text)", flexShrink: 0 }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function PillSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: "11px",
          padding: "4px 12px",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--accent)",
          background: "var(--accent-dim)",
          cursor: "pointer",
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}
      >
        {current?.label ?? value} v
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "4px",
            zIndex: 50,
            minWidth: "120px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
          className="fade-in"
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                textAlign: "left",
                padding: "5px 10px",
                borderRadius: "4px",
                border: "none",
                fontSize: "11px",
                cursor: "pointer",
                color: o.value === value ? "var(--accent)" : "var(--text)",
                background: o.value === value ? "var(--accent-dim)" : "transparent",
                letterSpacing: "0.04em",
                transition: "background 0.1s",
                whiteSpace: "nowrap",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
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

  const langOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.display }));
  const videoOptions = VIDEO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }));
  const audioOptions = AUDIO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }));
  const imageOptions = IMAGE_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }));

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <h2
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: "22px",
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        {t("settings.title")}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "520px" }}>

        {/* ── APPARENCE ─────────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.appearance")}>
          <SettingRow label={t("settings.theme")}>
            <PillSelect
              value={settings.theme}
              options={[
                { value: "dark",  label: "Sombre" },
                { value: "light", label: "Clair"  },
              ]}
              onChange={(v) => updateSettings({ theme: v as "dark" | "light" })}
            />
          </SettingRow>
          <SettingRow label={t("settings.language")}>
            <PillSelect
              value={settings.language}
              options={langOptions}
              onChange={(v) => updateSettings({ language: v })}
            />
          </SettingRow>
        </SectionCard>

        {/* ── CONVERSION ────────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.conversion")}>
          <SettingRow label={t("settings.outputDir")}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  maxWidth: "140px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={settings.output_dir ?? t("settings.outputDirDefault")}
              >
                {settings.output_dir ? settings.output_dir.split(/[\\/]/).pop() : t("settings.outputDirDefault")}
              </span>
              <button
                onClick={handlePickFolder}
                style={{
                  fontSize: "10px",
                  padding: "4px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--muted)",
                  background: "transparent",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                }}
              >
                {t("settings.chooseFolder").toUpperCase()}
              </button>
              {settings.output_dir && (
                <button
                  onClick={() => updateSettings({ output_dir: null })}
                  style={{
                    fontSize: "10px",
                    padding: "4px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--muted)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  x
                </button>
              )}
            </div>
          </SettingRow>

          <SettingRow label={t("settings.defaultVideo")}>
            <PillSelect
              value={settings.default_video_format}
              options={videoOptions}
              onChange={(v) => updateSettings({ default_video_format: v })}
            />
          </SettingRow>

          <SettingRow label={t("settings.defaultAudio")}>
            <PillSelect
              value={settings.default_audio_format}
              options={audioOptions}
              onChange={(v) => updateSettings({ default_audio_format: v })}
            />
          </SettingRow>

          <SettingRow label={t("settings.defaultImage")}>
            <PillSelect
              value={settings.default_image_format}
              options={imageOptions}
              onChange={(v) => updateSettings({ default_image_format: v })}
            />
          </SettingRow>
        </SectionCard>

        {/* ── A PROPOS ──────────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.about")}>
          <SettingRow label={t("settings.version")}>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>v{version || "…"}</span>
          </SettingRow>
          <SettingRow label="Donnees envoyees">
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Aucune</span>
          </SettingRow>
        </SectionCard>

      </div>
    </div>
  );
}
