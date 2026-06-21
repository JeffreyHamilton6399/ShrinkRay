/** A custom flat logo mark for ShrinkRay — four arrows pointing inward. */

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 9V4" />
      <path d="M9 9H4" />
      <path d="M15 9V4" />
      <path d="M15 9h5" />
      <path d="M9 15v5" />
      <path d="M9 15H4" />
      <path d="M15 15v5" />
      <path d="M15 15h5" />
    </svg>
  );
}
