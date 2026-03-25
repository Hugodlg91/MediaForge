import { useTranslation } from 'react-i18next';
import { IcnImage, IcnVideo, IcnAudio, IcnHistory, IcnSettings } from '../ui/Icons';

export type NavSection = 'image' | 'video' | 'audio' | 'history' | 'settings';

interface SidebarProps {
  active: NavSection;
  onChange: (section: NavSection) => void;
}

const navItems: { key: NavSection; Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }> }[] = [
  { key: 'image',    Icon: IcnImage },
  { key: 'video',    Icon: IcnVideo },
  { key: 'audio',    Icon: IcnAudio },
  { key: 'history',  Icon: IcnHistory },
  { key: 'settings', Icon: IcnSettings },
];

export function Sidebar({ active, onChange }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      style={{
        width: '72px',
        minWidth: '72px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '12px',
        paddingBottom: '12px',
        gap: '2px',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px', lineHeight: 1 }}>M</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', padding: '0 8px' }}>
        {navItems.map(({ key, Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              title={t("nav." + key)}
              style={{
                position: 'relative',
                width: '100%',
                height: '52px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'var(--accent-dim)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                transition: 'background 0.15s, color 0.15s',
                flexShrink: 0,
                outline: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-dim)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
                }
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: '-8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '24px',
                    background: 'var(--accent)',
                    borderRadius: '0 3px 3px 0',
                  }}
                />
              )}
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                }}
              >
                {t("nav." + key).slice(0, 3)}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
