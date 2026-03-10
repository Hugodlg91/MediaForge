import { useTranslation } from "react-i18next";

export type NavSection = "image" | "video" | "audio" | "history" | "settings";

interface SidebarProps {
  active: NavSection;
  onChange: (section: NavSection) => void;
}

const navItems: { key: NavSection; icon: string }[] = [
  { key: "image", icon: "🖼️" },
  { key: "video", icon: "🎬" },
  { key: "audio", icon: "🎵" },
  { key: "history", icon: "🕒" },
  { key: "settings", icon: "⚙️" },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-gray-900 border-r border-gray-800 h-full">
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-indigo-400 font-bold text-lg tracking-tight">MediaForge</h1>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              active === key
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <span className="text-base">{icon}</span>
            {t(`nav.${key}`)}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">v0.1.0</p>
      </div>
    </aside>
  );
}
