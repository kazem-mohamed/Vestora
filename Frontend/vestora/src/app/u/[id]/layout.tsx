import type { Metadata } from "next";
import { profileMetadata } from "@/lib/metadata/public-preview";

/**
 * Link previews for a member profile. Same reason as the venture layout: the page is a
 * client component, so `generateMetadata` has to live on the route layout.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const n = Number(id);
  return Number.isFinite(n) ? profileMetadata(n) : {};
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
