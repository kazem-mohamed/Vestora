"use client";

/**
 * The last resort: the root layout itself failed.
 *
 * This replaces `<html>` entirely, so none of the app's providers, fonts, theme or i18n
 * are available — which is exactly why it cannot use `StatusScene` or `t()`. Everything
 * here is inline and self-sufficient, and the copy is English-only because the locale
 * provider is part of what broke.
 *
 * Kept deliberately plain. A crash in the shell is not the moment for a guilloché plate;
 * it is the moment to still look like Vestora and offer a reload.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#14120F",
          color: "#F0EAE0",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <svg width="44" height="44" viewBox="0 0 512 512" style={{ marginBottom: "1.75rem" }}>
            <g fill="none" strokeLinecap="round">
              <path d="M140 168 L256 372" stroke="#C7A968" strokeWidth="46" />
              <path d="M372 168 L256 372" stroke="#8C6A43" strokeWidth="46" />
            </g>
            <circle cx="256" cy="372" r="32" fill="#F0EAE0" />
          </svg>

          <h1
            style={{
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              fontFamily: "Georgia, serif",
            }}
          >
            Vestora couldn&rsquo;t start
          </h1>
          <p
            style={{
              margin: "0.9rem 0 0",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "#B8AC99",
            }}
          >
            Something failed before the page could load. Nothing you did caused this, and
            nothing has been lost. Reloading usually clears it.
          </p>

          {error.digest && (
            <p
              style={{
                margin: "1.25rem 0 0",
                fontSize: "0.75rem",
                color: "#8C8275",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              minHeight: "2.75rem",
              padding: "0 1.75rem",
              borderRadius: "999px",
              border: "none",
              background: "#C7A968",
              color: "#14120F",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload Vestora
          </button>
        </div>
      </body>
    </html>
  );
}
