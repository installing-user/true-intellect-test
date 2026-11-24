import './brand.css';

export function Brand() {
  return (
    <span className="brand">
      <svg aria-hidden="true" viewBox="0 0 36 36" width="36" height="36" className="brand-mark">
        <rect width="36" height="36" rx="11" fill="var(--color-ink)" />
        <path
          d="M11.5 25V11M11.5 25l13-14M24.5 11v14"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand-name">Истинный интеллект</span>
    </span>
  );
}
