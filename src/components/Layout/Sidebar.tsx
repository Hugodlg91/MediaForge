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
    <aside className="w-16 shrink-0 flex flex-col bg-gray-900 border-r border-gray-700 h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-12 border-b border-gray-700 shrink-0">
        <span
          className="text-indigo-400 font-bold text-xl leading-none"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          M
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 py-3 flex-1">
        {navItems.map(({ key, code }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            title={t(`nav.${key}`)}
            className={`relative w-11 h-11 rounded-lg flex items-center justify-center transition-all ${
              active === key
                ? "bg-indigo-950 text-indigo-400"
                : "text-gray-500 hover:bg-indigo-950/40 hover:text-indigo-400"
            }`}
          >
            {active === key && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 rounded-r" />
            )}
            <span className="text-[8px] font-bold tracking-wider">{code}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
