import type { ReactNode } from 'react'

const PATHS = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
  focus: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M9 2h6M12 9v4l3 2M18 6l1.5-1.5" />
    </>
  ),
  workout: <path d="M3 9.5v5M6.5 7v10M17.5 7v10M21 9.5v5M6.5 12h11" />,
  breathe: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 0 0-6M3 16h9a3 3 0 1 1-3 3" />,
  arrow: <path d="M4 12h15M14 7l5 5-5 5" />,
  history: (
    <>
      <path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5" />
      <path d="M4 4v4.5h4.5M12 8v4.5l3 1.5" />
    </>
  ),
  device: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  evidence: <path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5ZM8 8.5h7M8 12h7" />,
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
