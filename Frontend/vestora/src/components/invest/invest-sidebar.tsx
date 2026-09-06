"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Banknote,
  Bookmark,
  Compass,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Briefcase,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import { useInvestorDashboard } from "@/lib/hooks/use-investor-dashboard";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export const INVEST_SECTIONS: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: "/invest", labelKey: "inv.nav.overview", icon: LayoutDashboard },
  { href: "/invest/pipeline", labelKey: "inv.nav.pipeline", icon: GitBranch },
  { href: "/invest/portfolio", labelKey: "inv.nav.portfolio", icon: Briefcase },
  // Receipts need a stable, linkable home. Folding them into the activity feed
  // would make a financial record read like a notification.
  { href: "/invest/payments", labelKey: "pay.nav", icon: Banknote },
  { href: "/invest/watchlist", labelKey: "inv.nav.watchlist", icon: Bookmark },
  { href: "/invest/activity", labelKey: "inv.nav.activity", icon: Activity },
];

const QUICK: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: "/projects", labelKey: "inv.quick.discover", icon: Compass },
  { href: "/messages", labelKey: "nav.messages", icon: MessageSquare },
  { href: "/settings/profile", labelKey: "nav.editProfile", icon: Settings },
];

export function isInvestActive(pathname: string, href: string): boolean {
  return href === "/invest" ? pathname === "/invest" : pathname.startsWith(href);
}

/** Route-based navigation for the investor command centre. */
export function InvestSidebar() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const pathname = usePathname();
  const { data } = useInvestorDashboard();
  const pendingCount = data?.kpis.pendingCount ?? 0;
  const watchCount = data?.kpis.watchlistCount ?? 0;
  const dueCount = data?.kpis.paymentDueCount ?? 0;

  const badgeFor = (href: string) =>
    href === "/invest/pipeline"
      ? pendingCount
      : href === "/invest/payments"
        ? dueCount
        : href === "/invest/watchlist"
          ? watchCount
          : 0;

  return (
    <nav className="flex flex-col gap-1">
      <p className={cn("px-3 pb-3 text-[11px] text-muted-foreground", rtl ? "" : "uppercase tracking-[0.2em]")}>
        {t("inv.sidebar.label")}
      </p>

      {INVEST_SECTIONS.map((s) => {
        const on = isInvestActive(pathname, s.href);
        const badge = badgeFor(s.href);
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
            <s.icon
              className={cn(
                "size-4 shrink-0 transition-transform duration-300 group-hover:scale-110",
                on && "text-primary"
              )}
              strokeWidth={1.7}
            />
            <span className="flex-1 text-start">{t(s.labelKey)}</span>
            {badge > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {badge}
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

/** Horizontal section pills for mobile (the sidebar is desktop-only). */
export function InvestMobileNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const { data } = useInvestorDashboard();
  const pendingCount = data?.kpis.pendingCount ?? 0;
  const dueCount = data?.kpis.paymentDueCount ?? 0;

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden [scrollbar-width:none]">
      {INVEST_SECTIONS.map((s) => {
        const on = isInvestActive(pathname, s.href);
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
            {((s.href === "/invest/pipeline" && pendingCount > 0) ||
              (s.href === "/invest/payments" && dueCount > 0)) && (
              <span className="grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                {s.href === "/invest/payments" ? dueCount : pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
