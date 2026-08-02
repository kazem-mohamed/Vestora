import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The iOS home-screen icon.
 *
 * Generated as a PNG rather than shipped as an SVG because Apple touch icons must be a
 * raster format — an `apple-icon.svg` is silently dropped by Next, which is exactly what
 * happened on the first attempt: the file existed, the build passed, and no link tag was
 * ever emitted.
 *
 * No rounded corners: iOS applies its own mask, and pre-rounding leaves pale corners
 * inside it. The plate is drawn edge to edge for the same reason.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14120F",
        }}
      >
        <svg width="118" height="118" viewBox="0 0 512 512">
          <g fill="none" strokeLinecap="round">
            <path d="M140 168 L256 372" stroke="#C7A968" strokeWidth="46" />
            <path d="M372 168 L256 372" stroke="#8C6A43" strokeWidth="46" />
          </g>
          <circle cx="256" cy="372" r="32" fill="#F0EAE0" />
        </svg>
      </div>
    ),
    size
  );
}
