import type { Metadata, Viewport } from "next";
import { Cinzel, Karla, Spectral, Aref_Ruqaa, Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cinzel",
});
const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-karla",
});
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
});
const arefRuqaa = Aref_Ruqaa({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-aref",
});
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
});

const fontVars = `${cinzel.variable} ${karla.variable} ${spectral.variable} ${arefRuqaa.variable} ${cairo.variable}`;

/**
 * Where the app is served from. Every relative metadata URL (OG image, canonical)
 * resolves against this, and without it Next emits warnings and social crawlers get
 * relative paths they cannot fetch.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * The honest one-liner.
 *
 * The previous description said "vetted entrepreneurs". Vestora reviews listings — an
 * admin approves them before they go public — but it verifies no identities, audits no
 * companies and guarantees nothing. "Reviewed" is provable; "vetted" reads as diligence
 * the platform has not performed, and this string is the very first claim anyone sees.
 */
const description =
  "Founders raising real rounds and investors who state what they back. Every listing is reviewed before it goes public, and every commitment is recorded on both sides.";

/**
 * `viewport-fit=cover` is what lets `env(safe-area-inset-*)` return anything
 * other than zero. Without it a notched phone silently ignores every safe-area
 * rule in the stylesheet, so fixed bars sit under the status bar and the home
 * indicator. Zoom is deliberately left enabled — capping it is an accessibility
 * failure, not a design decision.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0908" },
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Page titles slot into the template; the home page overrides it with `absolute`.
  title: {
    default: "Vestora — Where capital meets conviction",
    template: "%s · Vestora",
  },
  description,
  applicationName: "Vestora",
  keywords: [
    "venture funding",
    "investor directory",
    "founder fundraising",
    "investment commitments",
    "startup rounds",
  ],
  authors: [{ name: "Vestora" }],
  openGraph: {
    type: "website",
    siteName: "Vestora",
    title: "Vestora — Where capital meets conviction",
    description,
    url: siteUrl,
    locale: "en_US",
    alternateLocale: ["ar_EG"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vestora — Where capital meets conviction",
    description,
  },
  alternates: { canonical: "/" },
  // The platform holds member and venture data; none of it belongs in a search index
  // beyond the public surfaces, and those set their own robots rules per route.
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${fontVars} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
