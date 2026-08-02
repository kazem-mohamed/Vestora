"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Pencil,
  Plus,
  Rocket,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Panel } from "@/components/dashboard/panel";
import { timeAgo } from "@/components/dashboard/dashboard-panels";
import { authApi } from "@/lib/api/auth";
import { followsApi } from "@/lib/api/follows";
import { avatarUrl } from "@/lib/api/users";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useConversations } from "@/lib/hooks/use-chat";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FounderDashboard } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function initials(name: string): string {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function MiniAvatar({ id, name, size = 36 }: { id: number; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <img src={avatarUrl(id)} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-primary" style={{ fontFamily: "var(--font-heading)" }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/* ============ Quick actions ============ */

const ACTIONS: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: "/my-projects/new", labelKey: "mine.new", icon: Plus },
  { href: "/dashboard/ventures", labelKey: "dash.nav.myVentures", icon: Rocket },
  { href: "/messages", labelKey: "msg.title", icon: MessageSquare },
  { href: "/notifications", labelKey: "notif.title", icon: Bell },
  { href: "/settings/profile", labelKey: "nav.editProfile", icon: Pencil },
  { href: "/projects?saved=1", labelKey: "nav.saved", icon: Bookmark },
];

export function QuickActions() {
  const { t } = useLocale();
  return (
    <Panel title={t("dash.widget.quick")} elevated>
      <div className="grid grid-cols-3 gap-2.5">
        {ACTIONS.map((a, i) => (
          <motion.div
            key={a.href + a.labelKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.05, ease: EASE }}
          >
            <Link
              href={a.href}
              data-cursor="hover"
              className="group flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-background/40 px-2 py-3.5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.05] active:scale-95"
            >
              <span className="grid size-9 place-items-center rounded-full border border-primary/25 bg-primary/[0.05] text-primary transition-transform duration-300 group-hover:scale-110">
                <a.icon className="size-4" strokeWidth={1.7} />
              </span>
              <span className="text-[11px] leading-tight text-muted-foreground transition-colors group-hover:text-foreground">
                {t(a.labelKey)}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

/* ============ Profile completion ============ */

export function ProfileCompletion() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), enabled: !!user });
  const me = meQ.data;
  if (!me) return null;

  const items: { key: string; done: boolean }[] = [
    { key: "dash.completion.avatar", done: me.hasAvatar },
    { key: "dash.completion.cover", done: me.hasCover },
    { key: "dash.completion.bio", done: !!me.briefBio?.trim() },
    { key: "dash.completion.phone", done: !!me.phone?.trim() },
    { key: "dash.completion.birth", done: !!me.birthDate },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const missing = items.filter((i) => !i.done).slice(0, 2);

  return (
    <Panel
      title={t("dash.widget.completion")}
      href={pct < 100 ? "/settings/profile" : undefined}
      hrefLabel={t("profile.edit")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-numeric text-2xl leading-none">{pct}%</span>
        {pct === 100 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/[0.07] px-2.5 py-1 text-[11px] text-primary">
            <Check className="size-3" />
            {t("dash.completion.done")}
          </span>
        )}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
          className="h-full rounded-full bg-gradient-to-r from-bronze to-primary"
        />
      </div>
      {missing.length > 0 && (
        <ul className="mt-4 space-y-2">
          {missing.map((m) => (
            <li key={m.key} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full border border-bronze/60" />
              {t(m.key)}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ============ Needs attention (suggested actions) ============ */

export function SuggestedActions({ data }: { data: FounderDashboard }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Chevron = rtl ? ChevronLeft : ChevronRight;

  const zeroFunded = data.fundingByVenture.find((v) => v.raised === 0);
  const tasks: { key: string; label: string; href: string; count?: number; urgent?: boolean }[] = [];
  if (data.kpis.pendingRequestsCount > 0)
    tasks.push({
      key: "req",
      label: t("dash.attention.requests"),
      href: "/dashboard/requests",
      count: data.kpis.pendingRequestsCount,
      urgent: true,
    });
  if (data.kpis.unreadMessages > 0)
    tasks.push({
      key: "msg",
      label: t("dash.attention.messages"),
      href: "/messages",
      count: data.kpis.unreadMessages,
    });
  if (zeroFunded)
    tasks.push({
      key: "zero",
      label: `${t("dash.attention.zeroFunding")} — ${zeroFunded.name}`,
      href: `/projects/${zeroFunded.id}`,
    });

  return (
    <Panel title={t("dash.widget.attention")} icon={<Clock className="size-4" strokeWidth={1.7} />}>
      {tasks.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.05] px-4 py-3.5">
          <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-primary">
            <Check className="size-4" />
          </span>
          <p className="text-sm text-foreground">{t("dash.attention.caughtUp")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task, i) => (
            <motion.li
              key={task.key}
              initial={{ opacity: 0, x: rtl ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
            >
              <Link
                href={task.href}
                data-cursor="hover"
                className={cn(
                  "group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-300 hover:-translate-y-0.5",
                  task.urgent
                    ? "border-bronze/40 bg-bronze/[0.05] hover:border-bronze/60"
                    : "border-border/60 bg-background/40 hover:border-primary/40"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    task.urgent ? "animate-pulse bg-bronze" : "bg-primary"
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{task.label}</span>
                {task.count != null && (
                  <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {task.count}
                  </span>
                )}
                <Chevron className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ============ Recent notifications ============ */

const NOTIF_ACCENT: Record<string, string> = {
  ProjectSupported: "bg-bronze",
  ProjectSupportApproved: "bg-primary",
  ProjectSupportRejected: "bg-destructive",
  ProjectUpdate: "bg-primary",
  UserFollowed: "bg-primary",
  NewProject: "bg-primary",
};

export function RecentNotificationsWidget() {
  const { t } = useLocale();
  const { notifications } = useNotifications();
  const latest = notifications.slice(0, 3);

  return (
    <Panel title={t("notif.title")} href="/notifications">
      {latest.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{t("notif.empty")}</p>
      ) : (
        <ul className="space-y-1">
          {latest.map((n) => (
            <li key={n.notificationId} className="flex gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-foreground/[0.03]">
              <span
                className={cn(
                  "mt-1.5 size-1.5 shrink-0 rounded-full",
                  NOTIF_ACCENT[n.notificationType ?? ""] ?? "bg-muted-foreground",
                  n.isRead && "opacity-40"
                )}
              />
              <div className="min-w-0">
                <p className={cn("line-clamp-2 text-xs leading-snug", n.isRead ? "text-muted-foreground" : "text-foreground")}>
                  {n.content}
                </p>
                <p className="mt-0.5 font-numeric text-[10px] text-muted-foreground/70">
                  {timeAgo(n.dateCreated, t("time.now"))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ============ Recent messages ============ */

export function RecentMessagesWidget() {
  const { t } = useLocale();
  const { data: conversations } = useConversations();
  const latest = (conversations ?? []).slice(0, 3);

  return (
    <Panel title={t("msg.title")} href="/messages">
      {latest.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{t("msg.empty.title")}</p>
      ) : (
        <ul className="space-y-1">
          {latest.map((c) => (
            <li key={c.partnerId}>
              <Link
                href={`/messages?to=${c.partnerId}`}
                data-cursor="hover"
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-foreground/[0.03]"
              >
                <MiniAvatar id={c.partnerId} name={c.partnerName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{c.partnerName}</span>
                  <span
                    className={cn(
                      "block truncate text-[11px]",
                      c.unreadCount > 0 && !c.isMine ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {(c.isMine ? `${t("msg.you")}: ` : "") + c.content}
                  </span>
                </span>
                {c.unreadCount > 0 && !c.isMine && (
                  <span className="grid min-w-[18px] shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {c.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ============ Followers preview ============ */

export function FollowersPreview({ followersCount }: { followersCount: number }) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const q = useQuery({
    queryKey: ["follow-list", "followers", user?.id],
    queryFn: () => followsApi.followers(user!.id),
    enabled: !!user && followersCount > 0,
  });
  const followers = (q.data ?? []).slice(0, 5);
  const extra = Math.max(0, followersCount - followers.length);

  return (
    <Panel
      title={t("profile.followers")}
      icon={<UserRound className="size-4" strokeWidth={1.7} />}
      href={user ? `/u/${user.id}` : undefined}
      hrefLabel={t("profile.viewProfile")}
    >
      {followersCount === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">{t("dash.followers.none")}</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {followers.map((f) => (
              <Link key={f.id} href={`/u/${f.id}`} data-cursor="hover" className="ring-2 ring-card rounded-full transition-transform hover:-translate-y-0.5">
                <MiniAvatar id={f.id} name={f.userName} size={34} />
              </Link>
            ))}
            {extra > 0 && (
              <span className="grid size-[34px] place-items-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                +{extra}
              </span>
            )}
          </div>
          <span className="font-numeric text-2xl leading-none">{followersCount}</span>
        </div>
      )}
    </Panel>
  );
}

