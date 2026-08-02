/**
 * A photographic ground for a card that would otherwise be a flat tint.
 *
 * Four cards on the landing page carried nothing but a `color-mix` wash — the
 * figure card and the explore card in Featured, the industries card and the
 * get-started card in Why Vestora. Sitting between tiles that are full-bleed
 * footage, a flat panel reads as a hole in the grid rather than as a pause in
 * it.
 *
 * This is deliberately *ground*, not imagery: it sits at low opacity under the
 * content, carries no subject, and never competes with the type on top. The
 * card keeps its own tint underneath, which is what makes the whole thing
 * degrade cleanly — a `background-image` that 404s simply paints nothing, so
 * until the generated files land every card looks exactly as it does today
 * rather than showing a broken-image glyph.
 *
 * Briefs and prompts for each file: docs/LANDING-IMAGE-BRIEF.md
 */
export function CardGround({
  src,
  /** Higher for dark tiles that can carry more texture, lower under body copy. */
  opacity = 0.16,
  className,
}: {
  src: string;
  opacity?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 bg-cover bg-center ${className ?? ""}`}
      style={{ backgroundImage: `url(${src})`, opacity }}
    />
  );
}
