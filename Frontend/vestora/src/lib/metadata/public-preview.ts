import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5078";

/**
 * Server-side fetch for link-preview metadata.
 *
 * Hits the same anonymous endpoints the public pages use, with no credentials attached —
 * so a preview can only ever contain what a logged-out visitor could already read. A
 * crawler must never be handed something a person could not fetch themselves.
 *
 * Failures are swallowed on purpose: a metadata lookup must never take a page down. If
 * the API is unreachable the route falls back to the site-level card.
 */
async function publicJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      // Previews are re-fetched by crawlers rarely; a short revalidate keeps them
      // reasonably fresh without turning every share into an origin hit.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface VenturePreview {
  name: string;
  topic: string | null;
  description: string;
  category: string | null;
  location: string | null;
  ownerName: string;
  imageIds: number[];
  roundClosedAtUtc: string | null;
}

interface ProfilePreview {
  userName: string;
  userType: string;
  briefBio: string | null;
  investmentThesis: string | null;
  hasAvatar: boolean;
}

/** Trims to a clean sentence-ish length without cutting mid-word. */
function clamp(text: string, max = 180): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, t.lastIndexOf(" ", max) || max)}…`;
}

/**
 * A shared venture link.
 *
 * Uses the venture's own cover image when it has one — the picture the founder chose is
 * a far better card than a generic plate. Financial figures are deliberately excluded:
 * a commitment total in a preview is a number stripped of the context that makes it
 * honest, and it changes constantly.
 */
export async function ventureMetadata(id: number): Promise<Metadata> {
  const v = await publicJson<VenturePreview>(`/api/projects/details/${id}`);
  if (!v) return {};

  const detail = [v.category, v.location].filter(Boolean).join(" · ");
  const summary = v.topic?.trim() || clamp(v.description);
  const description = detail ? `${detail} — ${summary}` : summary;

  const cover = v.imageIds?.[0];
  const images = cover != null ? [`${API_URL}/api/projects/images/${cover}`] : undefined;

  return {
    title: v.name,
    description,
    openGraph: {
      type: "article",
      title: `${v.name} · Vestora`,
      description,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: `${v.name} · Vestora`,
      description,
      images,
    },
    alternates: { canonical: `/projects/${id}` },
    // A closed round is a record, not an open ask; keep it out of the index so search
    // never sends someone to a raise they cannot join.
    robots: v.roundClosedAtUtc ? { index: false, follow: true } : undefined,
  };
}

/**
 * A shared member profile.
 *
 * Carries only what the profile page already shows a stranger: name, role, bio, and an
 * investor's stated thesis. No counts, no email, no relationships — a preview is the
 * most widely copied surface there is, and it should hold the least.
 */
export async function profileMetadata(id: number): Promise<Metadata> {
  const p = await publicJson<ProfilePreview>(`/api/users/${id}`);
  if (!p) return {};

  const role = p.userType === "Investor" ? "Investor" : p.userType === "Innovator" ? "Founder" : "Member";
  const summary =
    p.investmentThesis?.trim() ||
    p.briefBio?.trim() ||
    `${role} on Vestora.`;

  const description = clamp(summary);

  return {
    title: `${p.userName} — ${role}`,
    description,
    openGraph: {
      type: "profile",
      title: `${p.userName} · Vestora`,
      description,
      // The avatar is a person's face; it is already public on the profile, and a
      // square avatar makes a poor wide card, so the site plate is used instead.
    },
    twitter: {
      card: "summary",
      title: `${p.userName} · Vestora`,
      description,
    },
    alternates: { canonical: `/u/${id}` },
  };
}
