/**
 * Bộ biểu tượng nội tuyến, cùng một ngữ pháp: lưới 20, nét 1.6, đầu tròn.
 * Không tải icon font ngoài — giao diện phải mở tức thì và chạy offline.
 */
interface IconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export const IconSearch = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="m13.2 13.2 3.3 3.3" />
  </svg>
);

export const IconClose = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

export const IconPlus = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
);

export const IconTrash = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5" />
    <path d="M5.5 5.5 6 16a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l.5-10.5" />
  </svg>
);

export const IconMore = ({ size = 18 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10" cy="4.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="10" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSun = ({ size = 17 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10" cy="10" r="3.4" />
    <path d="M10 2.6v1.7M10 15.7v1.7M17.4 10h-1.7M4.3 10H2.6M15.2 4.8l-1.2 1.2M6 14l-1.2 1.2M15.2 15.2 14 14M6 6 4.8 4.8" />
  </svg>
);

export const IconMoon = ({ size = 17 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M16.2 11.8A6.8 6.8 0 0 1 8.2 3.8a6.8 6.8 0 1 0 8 8Z" />
  </svg>
);

export const IconMonitor = ({ size = 17 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="2.8" y="3.8" width="14.4" height="9.6" rx="1.6" />
    <path d="M7.5 16.8h5M10 13.4v3.4" />
  </svg>
);

export const IconCheck = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m4.5 10.5 3.4 3.4 7.6-7.8" />
  </svg>
);

export const IconDownload = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M10 3v9m0 0 3.4-3.4M10 12 6.6 8.6" />
    <path d="M3.8 14.2v1.4a1.4 1.4 0 0 0 1.4 1.4h9.6a1.4 1.4 0 0 0 1.4-1.4v-1.4" />
  </svg>
);

export const IconUpload = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M10 12.6V3.4m0 0L6.6 6.8M10 3.4l3.4 3.4" />
    <path d="M3.8 14.2v1.4a1.4 1.4 0 0 0 1.4 1.4h9.6a1.4 1.4 0 0 0 1.4-1.4v-1.4" />
  </svg>
);

export const IconChevronDown = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m5.5 8 4.5 4.5L14.5 8" />
  </svg>
);

export const IconSliders = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3.5 6.5h7M14 6.5h2.5M3.5 13.5h2.5M9.5 13.5h7" />
    <circle cx="12.4" cy="6.5" r="1.9" />
    <circle cx="7.6" cy="13.5" r="1.9" />
  </svg>
);

export const IconWorkspaces = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="6" height="6" rx="1.6" />
    <rect x="11" y="3" width="6" height="6" rx="1.6" />
    <rect x="3" y="11" width="6" height="6" rx="1.6" />
    <rect x="11" y="11" width="6" height="6" rx="1.6" />
  </svg>
);

export const IconFilter = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3.2 4.8h13.6L11.6 11v4.4l-3.2 1.6V11Z" />
  </svg>
);
