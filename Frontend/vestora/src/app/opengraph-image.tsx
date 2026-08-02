import { ImageResponse } from "next/og";

export const alt = "Vestora — where capital meets conviction";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card every shared Vestora link renders.
 *
 * Generated rather than shipped as a file: the composition is the brand mark plus two
 * lines of type, which `ImageResponse` can draw exactly and which stays correct if the
 * wording changes. It also avoids committing a binary that would drift out of step with
 * the identity.
 *
 * Deliberately quiet — an espresso plate, an engraved rule, the mark, and a single
 * claim. A social card is the first impression of a financial product, and a busy one
 * reads as a growth-hack landing page rather than a private capital platform.
 *
 * No user data appears here: this is the site-level card, and route-level cards below
 * only ever use information already public on the page itself.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background:
            "radial-gradient(1100px 700px at 12% -10%, #241f19 0%, #14120F 55%, #100E0C 100%)",
          color: "#F0EAE0",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="58" height="58" viewBox="0 0 512 512">
            <g fill="none" strokeLinecap="round">
              <path d="M140 168 L256 372" stroke="#C7A968" strokeWidth="46" />
              <path d="M372 168 L256 372" stroke="#8C6A43" strokeWidth="46" />
            </g>
            <circle cx="256" cy="372" r="32" fill="#F0EAE0" />
          </svg>
          <div
            style={{
              fontSize: 34,
              letterSpacing: 12,
              fontWeight: 700,
              color: "#F0EAE0",
            }}
          >
            VESTORA
          </div>
        </div>

        {/* The claim */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.06,
              letterSpacing: -1.5,
              maxWidth: 900,
              color: "#F0EAE0",
            }}
          >
            Where capital meets conviction
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 27,
              lineHeight: 1.45,
              maxWidth: 780,
              color: "#B8AC99",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Founders raising real rounds. Investors who state what they back. A record of
            every commitment on both sides.
          </div>
        </div>

        {/* Engraved rule, as on a share certificate */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 120,
              height: 2,
              background: "linear-gradient(90deg, #C7A968 0%, rgba(199,169,104,0) 100%)",
            }}
          />
          <div
            style={{
              fontSize: 20,
              letterSpacing: 5,
              color: "#8C6A43",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            AN INVESTMENT RELATIONSHIP PLATFORM
          </div>
        </div>
      </div>
    ),
    size
  );
}
