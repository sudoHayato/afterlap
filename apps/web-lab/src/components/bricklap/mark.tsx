export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect
        x="5"
        y="10"
        width="22"
        height="12"
        rx="6"
        stroke="currentColor"
        strokeWidth="2.4"
      />
    </svg>
  );
}
