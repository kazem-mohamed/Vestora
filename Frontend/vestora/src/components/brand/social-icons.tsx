/**
 * Minimal, faithful brand glyphs for the footer's social row. lucide-react
 * ships no brand icons (project-wide gotcha), and this is the one place a
 * hand-drawn mark is the right call: these four shapes are stable, universal
 * trademarks, not a "best guess" at an unfamiliar logo (contrast with
 * share-button.tsx, which deliberately uses text labels for share-intent
 * links because those cover many less-standardized brands at once).
 */
type IconProps = { className?: string };

export function LinkedinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.56V20.5H6.94V8.5Z" />
      <path d="M5.25 7.06C6.35 7.06 7.25 6.16 7.25 5.06C7.25 3.95 6.35 3.06 5.25 3.06C4.14 3.06 3.25 3.95 3.25 5.06C3.25 6.16 4.14 7.06 5.25 7.06Z" />
      <path d="M13.28 8.5H10.06V20.5H13.44V14.32C13.44 12.61 13.76 10.95 15.88 10.95C17.97 10.95 18 12.9 18 14.43V20.5H21.38V13.76C21.38 10.84 20.75 8.24 17.35 8.24C15.72 8.24 14.62 9.14 14.17 10H14.12L13.28 8.5Z" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M13.6 10.62 20.02 3h-1.52l-5.58 6.62L8.46 3H3.2l6.73 9.62L3.2 21h1.52l5.9-6.99L15.54 21h5.26l-7.2-10.38Zm-2.09 2.48-.68-.97-5.44-7.78h2.34l4.39 6.28.68.97 5.71 8.17h-2.34l-4.66-6.67Z" />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.15" cy="6.85" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21.58 7.2a2.75 2.75 0 0 0-1.94-1.95C17.9 4.75 12 4.75 12 4.75s-5.9 0-7.64.5A2.75 2.75 0 0 0 2.42 7.2 28.8 28.8 0 0 0 1.92 12a28.8 28.8 0 0 0 .5 4.8 2.75 2.75 0 0 0 1.94 1.95c1.74.5 7.64.5 7.64.5s5.9 0 7.64-.5a2.75 2.75 0 0 0 1.94-1.95 28.8 28.8 0 0 0 .5-4.8 28.8 28.8 0 0 0-.5-4.8Z" />
      <path d="M9.9 15.02 15.5 12 9.9 8.98v6.04Z" fill="var(--background)" />
    </svg>
  );
}
