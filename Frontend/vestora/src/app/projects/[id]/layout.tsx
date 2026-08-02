import type { Metadata } from "next";
import { ventureMetadata } from "@/lib/metadata/public-preview";

/**
 * Exists solely to give the venture page real link previews.
 *
 * The page itself is a client component — it needs hooks for the parallax hero, the
 * queries and the auth-aware gating — and a client component cannot export
 * `generateMetadata`. A route layout can, so the metadata lives here and the layout
 * renders nothing but its children.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const n = Number(id);
  return Number.isFinite(n) ? ventureMetadata(n) : {};
}

export default function VentureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
