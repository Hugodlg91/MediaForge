import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Preset } from "../../hooks/usePresets";

/**
 * Compact, theme-aware bar to apply / save / delete conversion presets.
 * `current` is the snapshot of the active options; `onApply` receives a
 * preset's stored settings to restore them.
 */
export function PresetBar({
  presets,
  current,
  onApply,
  onSave,
  onDelete,
}: {
  presets: Preset[];
  current: Record<string, unknown>;
  onApply: (settings: Record<string, unknown>) => void;
  onSave: (name: string, settings: Record<string, unknown>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const commitSave = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed, current);
      setName("");
      setNaming(false);
    }
  };

  const pill: React.CSSProperties = {
    fontSize: "11px",
    padding: "4px 10px",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    background: "var(--accent-dim)",
    color: "var(--accent)",
    cursor: "pointer",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
      <span
        style={{
          fontSize: "10px",
          color: "var(--muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {t("presets.label")}
      </span>

      {presets.map((p) => (
        <span key={p.id} style={pill}>
          <span onClick={() => onApply(p.settings)} title={t("presets.apply")}>
            {p.name}
          </span>
          <span
            onClick={() => onDelete(p.id)}
            title={t("presets.delete")}
            style={{ color: "var(--muted)", fontSize: "10px" }}
          >
            ✕
          </span>
        </span>
      ))}

      {naming ? (
        <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitSave();
              if (e.key === "Escape") {
                setNaming(false);
                setName("");
              }
            }}
            placeholder={t("presets.namePlaceholder")}
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "var(--surface)",
              color: "var(--text)",
              outline: "none",
              width: "120px",
            }}
          />
          <button onClick={commitSave} style={{ ...pill, border: "none" }}>
            {t("presets.confirm")}
          </button>
        </span>
      ) : (
        <button
          onClick={() => setNaming(true)}
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            border: "1px dashed var(--border)",
            borderRadius: "6px",
            background: "transparent",
            color: "var(--muted)",
            cursor: "pointer",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          + {t("presets.save")}
        </button>
      )}
    </div>
  );
}
