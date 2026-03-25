import { writeFileSync } from 'fs';
import { resolve } from 'path';

const root = process.cwd();
const w = (rel, content) => writeFileSync(resolve(root, rel), content, 'utf8');

// ─── SettingsPage.tsx ─────────────────────────────────────────────────────────
w('src/components/Settings/SettingsPage.tsx', `import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettingsContext } from "../../context/SettingsContext";
import { IcnChevronDown, IcnFolder, IcnX, IcnCheck } from "../ui/Icons";

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
];

const VIDEO_FORMATS = ["mp4", "mkv", "avi", "mov", "webm"];
const AUDIO_FORMATS = ["mp3", "flac", "wav", "ogg", "aac", "m4a"];
const IMAGE_FORMATS = ["png", "jpg", "webp", "bmp", "tiff"];

// ── PillSelect with SVG chevron ──────────────────────────────────────────────

function PillSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px",
          padding: "7px 12px",
          border: "1px solid var(--border2)",
          borderRadius: "8px",
          color: "var(--text)",
          background: "var(--surface2)",
          cursor: "pointer",
          minWidth: "120px",
          justifyContent: "space-between",
          transition: "border-color 0.15s",
          fontWeight: 500,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; }}
        onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border2)"; }}
      >
        <span>{current?.label ?? value}</span>
        <span style={{ color: "var(--muted)", display: "flex", transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
          <IcnChevronDown size={13} strokeWidth={2} />
        </span>
      </button>

      {isOpen && (
        <div
          className="fade-in"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border2)",
            borderRadius: "10px",
            padding: "4px",
            zIndex: 50,
            minWidth: "140px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            gap: "1px",
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setIsOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                textAlign: "left",
                padding: "7px 10px",
                borderRadius: "7px",
                border: "none",
                fontSize: "12px",
                cursor: "pointer",
                color: o.value === value ? "var(--accent)" : "var(--text)",
                background: o.value === value ? "var(--accent-dim)" : "transparent",
                fontWeight: o.value === value ? 600 : 400,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (o.value !== value) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface2)";
              }}
              onMouseLeave={(e) => {
                if (o.value !== value) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span>{o.label}</span>
              {o.value === value && <IcnCheck size={12} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h3 style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "0.12em", fontWeight: 700, textTransform: "uppercase" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
      <label style={{ fontSize: "13px", color: "var(--text)", flexShrink: 0, fontWeight: 500 }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

// ── ThemeToggle ───────────────────────────────────────────────────────────────

function ThemeToggle({ value, onChange }: { value: "dark" | "light"; onChange: (v: "dark" | "light") => void }) {
  const { t } = useTranslation();
  return (
    <div className="seg-ctrl" style={{ minWidth: "160px" }}>
      <button className={value === "dark" ? "active" : ""} onClick={() => onChange("dark")}>
        🌙 {t("settings.themeDark")}
      </button>
      <button className={value === "light" ? "active" : ""} onClick={() => onChange("light")}>
        ☀️ {t("settings.themeLight")}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsContext();
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("0.1.0"));
  }, []);

  const handlePickFolder = async () => {
    const result = await open({ directory: true, multiple: false });
    if (typeof result === "string") await updateSettings({ output_dir: result });
  };

  const langOptions  = LANGUAGES.map((l) => ({ value: l.code,  label: l.label }));
  const videoOptions = VIDEO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }));
  const audioOptions = AUDIO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }));
  const imageOptions = IMAGE_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }));

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
        {t("settings.title")}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "540px" }}>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.appearance")}>
          <SettingRow label={t("settings.theme")}>
            <ThemeToggle value={settings.theme} onChange={(v) => updateSettings({ theme: v })} />
          </SettingRow>
          <SettingRow label={t("settings.language")}>
            <PillSelect value={settings.language} options={langOptions} onChange={(v) => updateSettings({ language: v })} />
          </SettingRow>
        </SectionCard>

        {/* ── Conversion ───────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.conversion")}>
          {/* Output folder */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>{t("settings.outputDir")}</label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border2)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  minWidth: 0,
                }}
              >
                <IcnFolder size={14} color="var(--muted)" />
                <span
                  style={{ fontSize: "12px", color: settings.output_dir ? "var(--text)" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
                  title={settings.output_dir ?? ""}
                >
                  {settings.output_dir ?? t("settings.outputDirDefault")}
                </span>
              </div>
              <button className="btn-ghost" onClick={handlePickFolder} style={{ fontSize: "12px", padding: "8px 12px", flexShrink: 0 }}>
                {t("settings.chooseFolder")}
              </button>
              {settings.output_dir && (
                <button
                  className="btn-ghost"
                  onClick={() => updateSettings({ output_dir: null })}
                  style={{ padding: "8px", flexShrink: 0 }}
                  title={t("settings.reset")}
                >
                  <IcnX size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Default formats */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>{t("settings.defaultFormats")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              {[
                { label: t("settings.defaultVideo"), val: settings.default_video_format, opts: videoOptions, key: "default_video_format" },
                { label: t("settings.defaultAudio"), val: settings.default_audio_format, opts: audioOptions, key: "default_audio_format" },
                { label: t("settings.defaultImage"), val: settings.default_image_format, opts: imageOptions, key: "default_image_format" },
              ].map(({ label, val, opts, key }) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
                  <PillSelect value={val} options={opts} onChange={(v) => updateSettings({ [key]: v } as Record<string, string>)} />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <SectionCard title={t("settings.about")}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>MediaForge</p>
              {version && <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{t("settings.version")} {version}</p>}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "8px",
                padding: "5px 10px",
              }}
            >
              <IcnCheck size={12} strokeWidth={2.5} color="var(--success)" />
              <span style={{ fontSize: "11px", color: "var(--success)", fontWeight: 600 }}>{t("settings.localOnly")}</span>
            </div>
          </div>
        </SectionCard>

      </div>
    </div>
  );
}
`);

console.log('✅ SettingsPage written');
