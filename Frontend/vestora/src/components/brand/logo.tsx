import { cn } from "@/lib/utils";

/**
 * Vestora mark: a gold and a bronze stroke converging to an ink point,
 * beside the VESTORA wordmark (Cinzel, tracked caps). Extracted 1:1 from
 * Vestora-Brand-Sheet.html.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="430 247 340 340"
        className="size-7 shrink-0"
        aria-hidden="true"
      >
        <g fill="none" strokeLinecap="round">
          <path d="M470 300 L600 530" stroke="var(--primary)" strokeWidth="26" />
          <path d="M730 300 L600 530" stroke="var(--bronze)" strokeWidth="26" />
        </g>
        <circle cx="600" cy="530" r="18" fill="currentColor" />
      </svg>
      {showWordmark && (
        <span
          className="text-lg font-bold tracking-[0.22em]"
          style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}
        >
          VESTORA
        </span>
      )}
    </span>
  );
}
