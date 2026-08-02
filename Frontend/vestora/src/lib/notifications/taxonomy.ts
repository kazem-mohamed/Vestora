import {
  AlertTriangle,
  Banknote,
  BellRing,
  CheckCircle2,
  FileCheck2,
  FileQuestion,
  FileX2,
  Flag,
  Gavel,
  HelpCircle,
  Hourglass,
  Megaphone,
  MessageSquareQuote,
  Rocket,
  SendHorizonal,
  Undo2,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Notification } from "@/lib/types/api";

/**
 * Three lanes, and the distinction is the whole point of the notification surface.
 *
 * `needsYou`  — nobody but the viewer can clear this. It stays until they do.
 * `outcome`   — somebody else decided something about the viewer. Worth reading once.
 * `activity`  — the world moved. Safe to never read.
 *
 * Before this existed, all fourteen backend types rendered as one row shape with a
 * coloured dot, and seven of them shared the same grey. An investor asking a question
 * in a deal room and a stranger tapping follow arrived identical — so people learned
 * to clear the whole list without reading it, which is the failure mode a notification
 * system is supposed to prevent.
 */
export type Lane = "needsYou" | "outcome" | "activity";

export interface NotificationKind {
  lane: Lane;
  icon: LucideIcon;
  /** Translated headline. The server's `content` carries the specifics beneath it. */
  titleKey: string;
  /** Which of the three lane accents this type wears. */
  tone: "primary" | "bronze" | "positive" | "negative" | "neutral";
  /** True only for the one type that can be settled without leaving the row. */
  resolvable?: boolean;
  /** Where the row goes. `null` means the event has no destination worth offering. */
  href: (n: Notification) => string | null;
}

const project = (n: Notification) => (n.projectId != null ? `/projects/${n.projectId}` : null);
const deal = (n: Notification) => (n.investmentId != null ? `/deals/${n.investmentId}` : null);
/** Deal rooms only exist once a request is approved; fall back to the listing. */
const dealOrProject = (n: Notification) => deal(n) ?? project(n);

/**
 * Every `NotificationType` the API actually writes — traced from the emit sites, not
 * guessed. Two naming conventions coexist (`PascalCase` from the original controllers,
 * `snake_case` from the deal room) and both are load-bearing on rows already in the
 * database, so both are kept rather than "tidied" into one.
 */
export const NOTIFICATION_KINDS: Record<string, NotificationKind> = {
  // ---- Needs you ----------------------------------------------------------
  ProjectSupported: {
    lane: "needsYou",
    icon: Gavel,
    titleKey: "notif.kind.supported",
    tone: "primary",
    resolvable: true,
    href: () => "/dashboard/requests",
  },
  deal_question: {
    lane: "needsYou",
    icon: HelpCircle,
    titleKey: "notif.kind.dealQuestion",
    tone: "primary",
    href: dealOrProject,
  },
  doc_request: {
    lane: "needsYou",
    icon: FileQuestion,
    titleKey: "notif.kind.docRequest",
    tone: "primary",
    href: dealOrProject,
  },
  ProjectRejected: {
    lane: "needsYou",
    icon: Flag,
    titleKey: "notif.kind.listingRejected",
    tone: "negative",
    // The founder's own listing, where the moderation note and the fix both live.
    href: (n) => (n.projectId != null ? `/my-projects/${n.projectId}/edit` : null),
  },

  /**
   * Money owed. The only way an investor learns a founder has asked, so it belongs
   * in the lane that does not clear itself — and it goes to the deal room, where
   * the payment action actually lives, rather than to a notification detail page.
   */
  funding_requested: {
    lane: "needsYou",
    icon: Hourglass,
    titleKey: "notif.kind.fundingRequested",
    tone: "primary",
    href: dealOrProject,
  },

  // ---- Outcomes -----------------------------------------------------------
  ProjectSupportApproved: {
    lane: "outcome",
    icon: CheckCircle2,
    titleKey: "notif.kind.approved",
    tone: "positive",
    href: dealOrProject,
  },
  ProjectSupportRejected: {
    lane: "outcome",
    icon: XCircle,
    titleKey: "notif.kind.declined",
    tone: "negative",
    href: project,
  },
  deal_answer: {
    lane: "outcome",
    icon: MessageSquareQuote,
    titleKey: "notif.kind.dealAnswer",
    tone: "primary",
    href: dealOrProject,
  },
  doc_fulfilled: {
    lane: "outcome",
    icon: FileCheck2,
    titleKey: "notif.kind.docFulfilled",
    tone: "positive",
    href: dealOrProject,
  },
  doc_declined: {
    lane: "outcome",
    icon: FileX2,
    titleKey: "notif.kind.docDeclined",
    tone: "neutral",
    href: dealOrProject,
  },
  round_closed: {
    lane: "outcome",
    icon: Undo2,
    titleKey: "notif.kind.roundClosed",
    tone: "bronze",
    href: project,
  },

  /**
   * The most consequential event the platform produces — for the founder above
   * all, since it is how they learn money arrived. Both sides receive it.
   */
  payment_succeeded: {
    lane: "outcome",
    icon: Banknote,
    titleKey: "notif.kind.paymentSucceeded",
    tone: "positive",
    href: dealOrProject,
  },

  /**
   * Only ever sent for a failure the investor did not watch happen — one that
   * resolved after they had already left the checkout. A notification telling
   * somebody about the error message currently on their screen is noise.
   */
  payment_failed: {
    lane: "outcome",
    icon: AlertTriangle,
    titleKey: "notif.kind.paymentFailed",
    tone: "negative",
    href: dealOrProject,
  },

  refund_completed: {
    lane: "outcome",
    icon: Undo2,
    titleKey: "notif.kind.refundCompleted",
    tone: "bronze",
    href: dealOrProject,
  },

  funding_request_expired: {
    lane: "activity",
    icon: Hourglass,
    titleKey: "notif.kind.fundingExpired",
    tone: "neutral",
    href: dealOrProject,
  },

  // ---- Activity -----------------------------------------------------------
  ProjectSupportSubmitted: {
    lane: "activity",
    icon: SendHorizonal,
    titleKey: "notif.kind.submitted",
    tone: "neutral",
    href: project,
  },
  ProjectUpdate: {
    lane: "activity",
    icon: Megaphone,
    titleKey: "notif.kind.update",
    tone: "primary",
    href: project,
  },
  NewProject: {
    lane: "activity",
    icon: Rocket,
    titleKey: "notif.kind.newVenture",
    tone: "primary",
    href: project,
  },
  UserFollowed: {
    lane: "activity",
    icon: UserPlus,
    titleKey: "notif.kind.followed",
    tone: "neutral",
    href: (n) => (n.actorUserId != null ? `/u/${n.actorUserId}` : null),
  },
};

/**
 * Anything the API starts sending that this file has not met yet still gets a row,
 * a destination when it has one, and the server's own sentence — it lands in
 * `activity` rather than vanishing or being mistaken for something urgent.
 */
const FALLBACK: NotificationKind = {
  lane: "activity",
  icon: BellRing,
  titleKey: "notif.kind.generic",
  tone: "neutral",
  href: (n) => project(n),
};

export function kindOf(n: Notification): NotificationKind {
  return NOTIFICATION_KINDS[n.notificationType ?? ""] ?? FALLBACK;
}

export function laneOf(n: Notification): Lane {
  return kindOf(n).lane;
}

/** The one type that can be settled from the row itself, and only while unread. */
export function isResolvable(n: Notification): boolean {
  return kindOf(n).resolvable === true && !n.isRead;
}

/**
 * Still owed by the viewer.
 *
 * Read state is a safe proxy for "settled" here because the API sets `IsRead` on the
 * request notification at the moment it is approved or declined — not when it is
 * looked at. What keeps a glance from counting as an answer is on the client side:
 * rows in this lane are never auto-marked read the way informational rows are.
 */
export function isOwed(n: Notification): boolean {
  return kindOf(n).lane === "needsYou" && !n.isRead;
}

export const TONE_DOT: Record<NotificationKind["tone"], string> = {
  primary: "text-primary",
  bronze: "text-bronze",
  positive: "text-primary",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
};

/** Paired with TONE_DOT for the glyph ring — `border-current/25` is not a real utility. */
export const TONE_RING: Record<NotificationKind["tone"], string> = {
  primary: "border-primary/25",
  bronze: "border-bronze/30",
  positive: "border-primary/25",
  negative: "border-destructive/30",
  neutral: "border-border",
};
