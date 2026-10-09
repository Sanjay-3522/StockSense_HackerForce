import type { SVGProps } from "react"

/** Small stroke-based icon set (no external icon library). */
export type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.75,
  stroke: "currentColor",
  "aria-hidden": true,
  ...props,
})

export const GridIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)

export const BoxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-9-5-9 5 9 5 9-5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8v8l9 5 9-5V8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 13v8" />
  </svg>
)

export const WarehouseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 4l9 5.5V20H3V9.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20v-6h6v6" />
  </svg>
)

export const ArrowDownTrayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
  </svg>
)

export const ArrowUpTrayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9m0 0l-4 4m4-4l4 4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
  </svg>
)

export const SwitchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
)

export const ScaleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M6 8l-3 6a3 3 0 006 0l-3-6zm12 0l-3 6a3 3 0 006 0l-3-6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21h16M6 8h4M14 8h4" />
  </svg>
)

export const HistoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
  </svg>
)

export const SparklesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z" />
  </svg>
)

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
  </svg>
)

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 006 0" />
  </svg>
)

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
)

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
)

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
  </svg>
)

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H9" />
  </svg>
)

export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41L12 22l-9-9 8.59-8.59A2 2 0 0113 4h6a1 1 0 011 1v6a2 2 0 01-.41 1.41z" />
    <circle cx="15.5" cy="8.5" r="1.5" />
  </svg>
)

export const AlertTriangleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1 1 0 003 19.5h18a1 1 0 00.86-1.46L13.71 3.86a1 1 0 00-1.72 0z" />
  </svg>
)

export const ClipboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="6" y="4" width="12" height="18" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V2h6v2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6" />
  </svg>
)

export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
  </svg>
)

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  </svg>
)

export const XIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
  </svg>
)

export const EditIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)
