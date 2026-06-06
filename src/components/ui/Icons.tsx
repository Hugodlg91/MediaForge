// Shared SVG icon components — 24x24 viewBox, stroke-based (Heroicons style)

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

const base = (size: number, sw: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function IcnImage({ size = 20, color, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function IcnVideo({ size = 20, color, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

export function IcnAudio({ size = 20, color, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function IcnHistory({ size = 20, color, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IcnSettings({ size = 20, color, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function IcnUpload({ size = 48, color, strokeWidth = 1.5, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

export function IcnCheck({ size = 16, color, strokeWidth = 2.5, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IcnX({ size = 14, color, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function IcnChevronDown({ size = 14, color, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IcnChevronRight({ size = 10, color, strokeWidth = 2, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function IcnFolder({ size = 16, color, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

export function IcnRefresh({ size = 16, color, strokeWidth = 1.75, style }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} style={{ color, ...style }}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
    </svg>
  );
}
