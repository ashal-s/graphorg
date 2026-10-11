/** The GraphOrg mark: three connected nodes on a rounded square. */
export function GraphOrgMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <g
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M12 8v4M12 12l-4.2 3.6M12 12l4.2 3.6" />
      </g>
      <g className="fill-primary-foreground">
        <circle cx="12" cy="7.2" r="2.1" />
        <circle cx="7.4" cy="16" r="2.1" />
        <circle cx="16.6" cy="16" r="2.1" />
      </g>
    </svg>
  );
}
