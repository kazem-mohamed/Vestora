/**
 * Guilloché rosette — the fine interwoven line engraving found on banknotes
 * and share certificates. Rendered as rotated ellipses + concentric rings in
 * `currentColor`, so the parent controls the (gold) tint and opacity.
 */
export function Guilloche({ className }: { className?: string }) {
  const petals = 72;
  const rings = [156, 128, 100, 60];

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="0.4">
        {Array.from({ length: petals }).map((_, i) => (
          <ellipse
            key={i}
            cx="200"
            cy="200"
            rx="150"
            ry="58"
            transform={`rotate(${(360 / petals) * i} 200 200)`}
          />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="0.7">
        {rings.map((r) => (
          <circle key={r} cx="200" cy="200" r={r} />
        ))}
      </g>
    </svg>
  );
}
