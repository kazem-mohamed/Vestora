import type { Metadata } from "next";
import { findLegalDocument } from "@/lib/legal/documents";

/** Real titles and descriptions for documents people link to directly. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = findLegalDocument(slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: `/legal/${doc.slug}` },
  };
}

export default function LegalDocLayout({ children }: { children: React.ReactNode }) {
  return children;
}
