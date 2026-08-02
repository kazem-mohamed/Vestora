"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, MessageSquare, Search, X } from "lucide-react";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { useConversations, usePresence } from "@/lib/hooks/use-chat";
import { avatarUrl } from "@/lib/api/users";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/types/api";

type Filter = "all" | "unread";

function initials(name: string): string {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({
  id,
  name,
  size = 48,
  online,
}: {
  id: number;
  name: string;
  size?: number;
  online?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border/70">
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl(id)}
            alt=""
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="text-sm text-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {initials(name)}
          </span>
        )}
      </span>
      {online && (
        <span className="absolute bottom-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card ltr:right-0.5 rtl:left-0.5" />
      )}
    </span>
  );
}

function Row({
  c,
  active,
  online,
  onSelect,
}: {
  c: ConversationSummary;
  active: boolean;
  online?: boolean;
  onSelect: (id: number, name: string) => void;
}) {
  const { t, locale } = useLocale();
  const timeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const unread = c.unreadCount > 0 && !c.isMine;
  const isImage = (c.attachmentType ?? "").startsWith("image/");
  const previewText =
    (c.isMine ? `${t("msg.you")}: ` : "") + (c.content || (isImage ? t("msg.photo") : ""));

  return (
    <button
      type="button"
      data-cursor="hover"
      onClick={() => onSelect(c.partnerId, c.partnerName)}
      className={cn(
        "group relative flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3.5 text-start transition-all duration-200 active:scale-[0.99]",
        active
          ? "bg-primary/[0.09] ring-1 ring-primary/20"
          : "hover:bg-foreground/[0.045]"
      )}
    >
      {/* Active rail */}
      <span
        className={cn(
          "absolute inset-y-3 start-0 w-[3px] rounded-full bg-primary transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
      />

      <Avatar id={c.partnerId} name={c.partnerName} online={online} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[15px] leading-tight",
              unread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
            )}
          >
            {c.partnerName}
          </span>
          <span
            className={cn(
              "shrink-0 font-numeric text-[11px] tabular-nums",
              unread ? "font-semibold text-primary" : "text-muted-foreground/70"
            )}
          >
            {timeFmt.format(new Date(c.sentAt))}
          </span>
        </span>

        <span className="mt-1 flex items-center justify-between gap-2">
          <span
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-[13px] leading-snug",
              unread ? "font-medium text-foreground/80" : "text-muted-foreground"
            )}
          >
            {isImage && <ImageIcon className="size-3.5 shrink-0" strokeWidth={1.75} />}
            <span className="truncate">{previewText}</span>
          </span>
          {unread && (
            <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-primary px-1.5 font-numeric text-[10px] font-bold text-primary-foreground shadow-sm">
              {c.unreadCount > 9 ? "9+" : c.unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      data-cursor="hover"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 active:scale-[0.97]",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "border border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {children}
      {count != null && count > 0 && (
        <span
          className={cn(
            "grid h-4 min-w-[16px] place-items-center rounded-full px-1 font-numeric text-[10px] font-bold",
            active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"
          )}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

export function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
}) {
  const { t } = useLocale();
  const { data: conversations, isLoading } = useConversations();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const partnerIds = useMemo(
    () => (conversations ?? []).map((c) => c.partnerId),
    [conversations]
  );
  const { online } = usePresence(partnerIds);

  const unreadTotal = useMemo(
    () => (conversations ?? []).filter((c) => c.unreadCount > 0 && !c.isMine).length,
    [conversations]
  );

  const filtered = useMemo(() => {
    let list = conversations ?? [];
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0 && !c.isMine);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (c) =>
          c.partnerName.toLowerCase().includes(query) ||
          c.content.toLowerCase().includes(query)
      );
    }
    return list;
  }, [conversations, filter, q]);

  const hasConversations = (conversations ?? []).length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search + filters */}
      {hasConversations && (
        <div className="space-y-3 px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70 ltr:left-3.5 rtl:right-3.5" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("msg.search.ph")}
              aria-label={t("msg.search.ph")}
              className="h-11 w-full rounded-full border border-border/60 bg-background/50 px-10 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-ring/10"
            />
            {q && (
              <button
                type="button"
                data-cursor="hover"
                aria-label={t("msg.close")}
                onClick={() => setQ("")}
                className="absolute top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground ltr:right-3 rtl:left-3"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              {t("msg.filter.all")}
            </FilterChip>
            <FilterChip
              active={filter === "unread"}
              onClick={() => setFilter("unread")}
              count={unreadTotal}
            >
              {t("msg.filter.unread")}
            </FilterChip>
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          <div className="space-y-1.5 px-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 px-2 py-3.5">
                <span className="skeleton-shimmer size-12 shrink-0 rounded-full" />
                <span className="flex-1 space-y-2.5">
                  <span className="skeleton-shimmer block h-3.5 w-32 rounded-full" />
                  <span className="skeleton-shimmer block h-3 w-44 rounded-full" />
                </span>
              </div>
            ))}
          </div>
        ) : !hasConversations ? (
          <div className="px-2 pt-2">
            <ProfileEmptyState
              compact
              icon={MessageSquare}
              title={t("msg.empty.title")}
              body={t("msg.empty.body")}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-2 pt-2">
            <ProfileEmptyState
              compact
              icon={Search}
              title={t("msg.filter.none.title")}
              body={t("msg.filter.none.body")}
            />
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((c) => (
              <Row
                key={c.partnerId}
                c={c}
                active={c.partnerId === selectedId}
                online={online[c.partnerId] ?? false}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
