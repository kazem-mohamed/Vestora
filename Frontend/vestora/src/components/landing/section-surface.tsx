"use client";

import { Guilloche } from "@/components/auth/guilloche";
import { cn } from "@/lib/utils";

/**
 * The one background system for every landing section. Two treatments,
 * fixed values — so the page reads as a single premium surface instead of a
 * patchwork of one-off tints.
 *
 *  • "engraved" — the page base, with a faint recurring brand rosette.
 *  • "panel"    — a single raised warm tint + a seam that dissolves back
 *                 into the base at the bottom edge.
 *
 * Both carry the same whisper of grain. Alternate them (engraved / panel /
 * engraved / panel) down the page.
 */

// One tint, referenced everywhere a raised panel is needed (incl. Featured).
export const PANEL_BG =
  "color-mix(in srgb, var(--primary) 5%, var(--background))";

export function SectionSurface({
  id,
  variant = "engraved",
  className,
  children,
  style,
}: {
  id?: string;
  variant?: "engraved" | "panel";
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      id={id}
      style={style}
      className={cn("relative overflow-hidden bg-background", className)}
    >
      {variant === "panel" && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: PANEL_BG }}
        />
      )}
      {variant === "engraved" && (
        <Guilloche className="pointer-events-none absolute left-1/2 top-1/2 h-[860px] w-[860px] -translate-x-1/2 -translate-y-1/2 text-primary/[0.07] dark:text-primary/[0.045]" />
      )}

      {/* The shared whisper of grain. */}
      <div className="film-grain pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-overlay" />

      <div className="relative">{children}</div>

      {variant === "panel" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--background))",
          }}
        />
      )}
    </section>
  );
}
