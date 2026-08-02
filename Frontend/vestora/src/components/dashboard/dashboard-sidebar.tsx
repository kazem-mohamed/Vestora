"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  BarChart3,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Rocket,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useFounderDashboard } from "@/lib/hooks/use-dashboard";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export const DASH_SECTIONS: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: "/dashboard", labelKey: "dash.nav.overview", icon: LayoutDashboard },
  { href: "/dashboard/funding", labelKey: "dash.nav.funding", icon: Banknote },
  { href: "/dashboard/requests", labelKey: "dash.nav.requests", icon: Inbox },
  { href: "/dashboard/ventures", labelKey: "dash.nav.ventures", icon: Rocket },
  { href: "/dashboard/analytics", labelKey: "dash.nav.analytics", icon: BarChart3 },
];

const QUICK: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: "/my-projects/new", labelKey: "mine.new", icon: Plus },
  { href: "/messages", labelKey: "nav.messages", icon: MessageSquare },
  { href: "/settings/profile", labelKey: "nav.editProfile", icon: Settings },
];

export function isDashActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

/** Route-based control-room navigation — each section is a real page. */
export function DashboardSidebar() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const pathname = usePathname();
  const { data } = useFounderDashboard();
  const pendingCount = data?.kpis.pendingRequestsCount ?? 0;

  return (
    <nav className="flex flex-col gap-1">
      <p className={cn("px-3 pb-3 text-[11px] text-muted-foreground", rtl ? "" : "uppercase tracking-[0.2em]")}>
        {t("dash.sidebar.label")}
      </p>

      {DASH_SECTIONS.map((s) => {
        const on = isDashActive(pathname, s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            data-cursor="hover"
            aria-current={on ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
              on
                ? "bg-primary/[0.09] text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_25%,transparent)]"
                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "absolute inset-y-1.5 w-0.5 rounded-full bg-primary transition-opacity",
                rtl ? "end-0" : "start-0",
                on ? "opacity-100" : "opacity-0"
              )}
            />
            <s.icon className={cn("size-4 shrink-0 transition-transform duration-300 group-hover:scale-110", on && "text-primary")} strokeWidth={1.7} />
            <span className="flex-1 text-start">{t(s.labelKey)}</span>
            {s.href === "/dashboard/requests" && pendingCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}

      <span className="mx-3 my-3 h-px bg-border/70" />

      <p className={cn("px-3 pb-2 text-[11px] text-muted-foreground", rtl ? "" : "uppercase tracking-[0.2em]")}>
        {t("dash.sidebar.quick")}
      </p>
      {QUICK.map((q) => (
        <Link
          key={q.href}
          href={q.href}
          data-cursor="hover"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <q.icon className="size-4 shrink-0 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.7} />
          <span className="flex-1 text-start">{t(q.labelKey)}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Compact horizontal section nav for mobile (the sidebar is desktop-only). */
export function DashboardMobileNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const { data } = useFounderDashboard();
  const pendingCount = data?.kpis.pendingRequestsCount ?? 0;

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none]">
      {DASH_SECTIONS.map((s) => {
        const on = isDashActive(pathname, s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            data-cursor="hover"
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors",
              on
                ? "border-primary/50 bg-primary/[0.08] text-foreground"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            <s.icon className={cn("size-3.5", on && "text-primary")} strokeWidth={1.7} />
            {t(s.labelKey)}
            {s.href === "/dashboard/requests" && pendingCount > 0 && (
              <span className="grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
