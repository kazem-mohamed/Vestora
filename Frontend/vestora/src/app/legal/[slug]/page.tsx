"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { LegalReader } from "@/components/legal/legal-reader";
import { findLegalDocument } from "@/lib/legal/documents";

/**
 * One policy document.
 *
 * A single dynamic route rather than six files: the documents differ in content, not in
 * how they are read, and six copies of the same reader would drift apart the first time
 * one of them was improved.
 */
export default function LegalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const doc = findLegalDocument(slug);
  if (!doc) notFound();
  return <LegalReader doc={doc} />;
}
