import { useTranslation } from "react-i18next";

export type NavSection = "image" | "video" | "audio" | "history" | "settings";

interface SidebarProps {
  active: NavSection;
  onChange: (section: NavSection) => void;
}

const navItems: { key: NavSection; code: string }[] = [
  { key: "image",    code: "IMG" },
  { key: "video",    code: "VID" },
  { key: "audio",    code: "AUD" },
  { key: "history",  code: "LOG" },
  { key: "settings", code: "CFG" },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      style={{
        width: "64px",
        minWidth: "64px",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        gap: "4px",
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: "18px",
          color: "var(--accent)",
          marginBottom: "20px",
          lineHeight: 1,
          display: "block",
        }}
      >
        M
      </span>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", width: "100%" }}>
        {navItems.map(({ key, code }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              title={t(`nav.${key}`)}
              style={{
                position: "relative",
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                background: isActive ? "var(--accent-dim)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--muted)",
                transition: "background 0.15s, color 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-dim)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                }
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: "-1px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "3px",
                    height: "20px",
                    background: "var(--accent)",
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                {code}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
