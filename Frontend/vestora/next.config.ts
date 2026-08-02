import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5078";
const api = new URL(apiUrl);

const nextConfig: NextConfig = {
  // Note: the Browse → venture morph uses the browser's native View Transitions
  // API directly (see lib/browse/view-transition.ts). React's <ViewTransition>
  // component needs a canary React build; this project is on stable 19.2.

  // Venture artwork is proxied through this origin rather than linked straight at
  // the API. Two reasons: the image optimizer refuses to fetch loopback/private
  // addresses (SSRF protection), and a same-origin image avoids the CORS taint
  // that blocked any client-side work on these pictures.
  async rewrites() {
    return [
      {
        source: "/venture-image/:id",
        destination: `${apiUrl}/api/projects/images/:id`,
      },
    ];
  },

  images: {
    // Routing artwork through the optimizer gives resized, modern-format files
    // instead of shipping a 400 KB, 1536px original into a 400px tile.
    localPatterns: [{ pathname: "/venture-image/**", search: "" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
