import type { Message } from "@/lib/types/api";

/** Consecutive messages from one sender within this window render as a group. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/** Local calendar-day key (yyyy-mm-dd) used to break the thread into days. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** A rendered row in the thread: a day heading, the unread marker, or a bubble. */
export type ThreadItem =
  | { kind: "day"; id: string; iso: string }
  | { kind: "unread"; id: string }
  | {
      kind: "msg";
      id: number;
      msg: Message;
      mine: boolean;
      firstOfGroup: boolean;
      lastOfGroup: boolean;
    };

/**
 * Flattens a chronological thread into render items: day headings between
 * calendar days, an unread divider before the first message I haven't read,
 * and per-message grouping flags (sender + 5-min window) so consecutive
 * bubbles stack tightly and only the tail carries an avatar + timestamp.
 */
export function buildThreadItems(messages: Message[], meId: number): ThreadItem[] {
  const firstUnreadIdx = messages.findIndex((m) => m.receiverId === meId && !m.isRead);

  const startsGroup = (i: number): boolean => {
    if (i === 0) return true;
    if (i === firstUnreadIdx) return true; // the divider always breaks the group
    const cur = messages[i];
    const prev = messages[i - 1];
    if (cur.senderId !== prev.senderId) return true;
    if (dayKey(cur.sentAt) !== dayKey(prev.sentAt)) return true;
    return new Date(cur.sentAt).getTime() - new Date(prev.sentAt).getTime() > GROUP_WINDOW_MS;
  };

  const items: ThreadItem[] = [];
  messages.forEach((m, i) => {
    if (i === 0 || dayKey(m.sentAt) !== dayKey(messages[i - 1].sentAt)) {
      items.push({ kind: "day", id: `day-${dayKey(m.sentAt)}`, iso: m.sentAt });
    }
    if (i === firstUnreadIdx) {
      items.push({ kind: "unread", id: "unread" });
    }
    items.push({
      kind: "msg",
      id: m.id,
      msg: m,
      mine: m.senderId === meId,
      firstOfGroup: startsGroup(i),
      lastOfGroup: i === messages.length - 1 || startsGroup(i + 1),
    });
  });
  return items;
}

/** "Today" / "Yesterday" / a localized full date for a day heading. */
export function dayLabel(
  iso: string,
  locale: string,
  labels: { today: string; yesterday: string }
): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return labels.today;
  if (diffDays === 1) return labels.yesterday;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(d);
}
