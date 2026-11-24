import type { ReactNode } from 'react';
import './icon.css';

const paths = {
  logout: <path d="M10 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3M14 12h6M17 8.5l3.5 3.5-3.5 3.5" />,
  retry: <path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7M19.5 4.5v4.2h-4.2" />,
  chevronLeft: <path d="M14.5 6l-6 6 6 6" />,
  chevronRight: <path d="M9.5 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13.5l2.5-7.5h11l2.5 7.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" />
      <path d="M4 13.5h4.5l1 2.5h5l1-2.5H20" />
    </>
  ),
  pin: (
    <>
      <path d="M12 20.5s6.5-5.6 6.5-10.5a6.5 6.5 0 1 0-13 0c0 4.9 6.5 10.5 6.5 10.5z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />,
  half: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor" stroke="none" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="spinner"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
    </svg>
  );
}
