import type { ProjectCard } from "@/lib/types/api";

/**
 * Editorial markers a venture can earn. Every one is derived from stored data —
 * nothing here is decorative or invented. A card shows at most one, by the
 * priority in SIGNAL_ORDER, so the grid never turns into a badge soup.
 */
export type VentureSignal =
  | "funded"
  | "closing"
  | "committed"
  | "fresh"
  | "active"
  | "watched";

const DAY = 24 * 60 * 60 * 1000;

/** A round is "closing" once most of it is spoken for but it is still open. */
const CLOSING_THRESHOLD = 0.75;
const FRESH_DAYS = 30;
const ACTIVE_DAYS = 30;

/**
 * Priority when a venture qualifies for several markers. Urgency first, then
 * whether you can still get in at all, then liveness. A fully committed round
 * being "Active" is true but useless — you cannot join it.
 */
export const SIGNAL_ORDER: VentureSignal[] = [
  // A round that has actually been paid for outranks everything: it is the
  // strongest thing that can be true about a venture on this platform.
  "funded",
  "closing",
  "committed",
  "fresh",
  "active",
  "watched",
];

export const SIGNAL_LABEL_KEY: Record<VentureSignal, string> = {
  funded: "fund.status.Funded",
  closing: "browse.signal.closing",
  committed: "browse.signal.committed",
  fresh: "browse.signal.fresh",
  active: "browse.signal.active",
  watched: "browse.signal.watched",
};

export function commitmentRatio(p: ProjectCard): number {
  return p.investmentNeeded > 0 ? p.committedAmount / p.investmentNeeded : 0;
}

export function commitmentPct(p: ProjectCard): number {
  return Math.min(100, Math.round(commitmentRatio(p) * 100));
}

/** Settled money as a share of the goal — the figure a card leads with. */
export function fundedRatio(p: ProjectCard): number {
  return p.investmentNeeded > 0 ? p.fundedAmount / p.investmentNeeded : 0;
}

export function fundedPct(p: ProjectCard): number {
  return Math.min(100, Math.round(fundedRatio(p) * 100));
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / DAY;
}

/**
 * `viewThreshold` is the cut-off for the "most watched" marker, computed from the
 * current result set rather than a hardcoded number — so it always means
 * "unusually watched compared with what you are looking at".
 */
export function viewThreshold(items: ProjectCard[]): number {
  const counts = items.map((i) => i.viewCount).filter((n) => n > 0).sort((a, b) => b - a);
  if (counts.length < 4) return Number.POSITIVE_INFINITY;
  // Top quartile, and only if it actually stands apart from the median.
  const top = counts[Math.floor(counts.length * 0.25)];
  const median = counts[Math.floor(counts.length * 0.5)];
  return top > median ? top : Number.POSITIVE_INFINITY;
}

export function signalsFor(p: ProjectCard, threshold: number): VentureSignal[] {
  const found: VentureSignal[] = [];
  const ratio = commitmentRatio(p);
  const age = daysSince(p.createdDate);
  const sinceUpdate = daysSince(p.lastUpdateAt);

  if (p.isFullyFunded) found.push("funded");
  else if (p.isFullyCommitted) found.push("committed");
  else if (ratio >= CLOSING_THRESHOLD) found.push("closing");

  if (age !== null && age <= FRESH_DAYS) found.push("fresh");
  if (sinceUpdate !== null && sinceUpdate <= ACTIVE_DAYS) found.push("active");
  if (p.viewCount >= threshold) found.push("watched");

  return found;
}

/** The single marker a card displays, or null when the venture has earned none. */
export function primarySignal(p: ProjectCard, threshold: number): VentureSignal | null {
  const found = signalsFor(p, threshold);
  return SIGNAL_ORDER.find((s) => found.includes(s)) ?? null;
}

/**
 * Picks the venture to put in the spotlight and says WHY, so the prominence is
 * earned and explainable rather than "whatever sorted first".
 * Preference: an open round closest to completing > the most watched > the newest.
 */
export function pickSpotlight(
  items: ProjectCard[]
): { venture: ProjectCard; reason: "closing" | "watched" | "fresh" } | null {
  if (items.length === 0) return null;

  const open = items.filter((p) => !p.isFullyCommitted && commitmentRatio(p) > 0);
  if (open.length > 0) {
    const best = open.reduce((a, b) => (commitmentRatio(b) > commitmentRatio(a) ? b : a));
    if (commitmentRatio(best) >= 0.4) return { venture: best, reason: "closing" };
  }

  const watched = items.filter((p) => p.viewCount > 0);
  if (watched.length > 0) {
    const best = watched.reduce((a, b) => (b.viewCount > a.viewCount ? b : a));
    if (best.viewCount > 0) return { venture: best, reason: "watched" };
  }

  const newest = items.reduce((a, b) =>
    Date.parse(b.createdDate) > Date.parse(a.createdDate) ? b : a
  );
  return { venture: newest, reason: "fresh" };
}

export const SPOTLIGHT_REASON_KEY: Record<"closing" | "watched" | "fresh", string> = {
  closing: "browse.spotlight.closing",
  watched: "browse.spotlight.watched",
  fresh: "browse.spotlight.fresh",
};

/** Sector shown on a card: the more specific of the two the founder filled in. */
export function sectorOf(p: ProjectCard): string | null {
  return p.category || p.industry || null;
}
