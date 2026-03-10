import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsContext } from "../../context/SettingsContext";

const LANGUAGES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "de", label: "DE" },
  { code: "pt", label: "PT" },
];

export function TitleBar() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsContext();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === settings.language) ?? LANGUAGES[1];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    if (langOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  const pillStyle: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: "4px",
    fontFamily: "'DM Mono', monospace",
    fontSize: "10px",
    padding: "2px 8px",
    color: "var(--muted)",
    background: "transparent",
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "border-color 0.15s, color 0.15s",
    whiteSpace: "nowrap" as const,
  };

  return (
    <header
      style={{
        height: "38px",
        minHeight: "38px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 14px",
        flexShrink: 0,
        userSelect: "none",
      }}
      data-tauri-drag-region
    >
      {/* Left: macOS circles */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span
          style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f57", display: "inline-block" }}
        />
        <span
          style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#febc2e", display: "inline-block" }}
        />
        <span
          style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#28c840", display: "inline-block" }}
        />
      </div>

      {/* Centre: app name */}
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: "12px",
          letterSpacing: "0.15em",
          color: "var(--muted)",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      >
        MEDIAFORGE
      </span>

      {/* Right: pills */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {/* Theme pill */}
        <button
          style={pillStyle}
          onClick={() =>
            updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
          }
          title={t("settings.theme")}
        >
          {settings.theme === "dark" ? "LIGHT" : "DARK"}
        </button>

        {/* Language pill + dropdown */}
        <div ref={langRef} style={{ position: "relative" }}>
          <button
            style={pillStyle}
            onClick={() => setLangOpen((v) => !v)}
            title={t("settings.language")}
          >
            {currentLang.label}
          </button>

          {langOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                zIndex: 100,
                minWidth: "60px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              }}
              className="fade-in"
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    updateSettings({ language: l.code });
                    setLangOpen(false);
                  }}
                  style={{
                    ...pillStyle,
                    display: "block",
                    textAlign: "center",
                    borderRadius: "4px",
                    border: "none",
                    padding: "4px 10px",
                    color: l.code === settings.language ? "var(--accent)" : "var(--muted)",
                    background: l.code === settings.language ? "var(--accent-dim)" : "transparent",
                    width: "100%",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
