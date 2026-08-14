"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Banknote,
  Flag,
  LayoutDashboard,
  Rocket,
  Scale,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useOpenReportsCount, usePendingProjectsCount } from "@/lib/hooks/use-admin";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

interface AdminSection {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

/**
 * Eight flat entries mixed the day's queue with long-range monitoring, so
 * "what needs me now" sat beside "what happened last month" with equal weight.
 * Grouped by what the admin is actually doing.
 */
const GROUPS: { titleKey: string | null; items: AdminSection[] }[] = [
  {
    titleKey: null,
    items: [
      { href: "/admin", labelKey: "admin.nav.overview", icon: LayoutDashboard },
      // Beside the overview rather than under oversight: the overview says what is
      // true now, this says how it got there. They are read together.
      { href: "/admin/analytics", labelKey: "admin.nav.analytics", icon: TrendingUp },
    ],
  },
  {
    // The queue: things waiting on a decision.
    titleKey: "admin.group.queue",
    items: [
      { href: "/admin/review", labelKey: "admin.nav.review", icon: Stamp },
      { href: "/admin/reports", labelKey: "admin.nav.reports", icon: Flag },
    ],
  },
  {
    // The registry: the platform's people, listings, and — now that money moves —
    // its own economics.
    titleKey: "admin.group.manage",
    items: [
      { href: "/admin/users", labelKey: "admin.nav.users", icon: Users },
      { href: "/admin/ventures", labelKey: "admin.nav.ventures", icon: Rocket },
      { href: "/admin/revenue", labelKey: "adm.rev.nav", icon: Banknote },
    ],
  },
  {
    // The record: what already happened.
    titleKey: "admin.group.oversight",
    items: [
      { href: "/admin/reconciliation", labelKey: "adm.recon.nav", icon: Scale },
      { href: "/admin/audit", labelKey: "admin.nav.audit", icon: ScrollText },
      { href: "/admin/security", labelKey: "admin.nav.security", icon: ShieldAlert },
      { href: "/admin/activity", labelKey: "admin.nav.activity", icon: Activity },
    ],
  },
];

const SECTIONS: AdminSection[] = GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const pathname = usePathname();
  const openReports = useOpenReportsCount();
  const pendingReview = usePendingProjectsCount();

  const badgeFor = (href: string) =>
    href === "/admin/reports" ? openReports : href === "/admin/review" ? pendingReview : 0;

  return (
    <nav className="flex flex-col gap-1">
      <p className={cn("flex items-center gap-2 px-3 pb-3 text-[11px] text-muted-foreground", rtl ? "" : "uppercase tracking-[0.2em]")}>
        <ShieldCheck className="size-3.5 text-primary" />
        {t("admin.sidebar.label")}
      </p>
      {GROUPS.map((group, gi) => (
        <div key={group.titleKey ?? "root"} className={cn(gi > 0 && "mt-4")}>
          {group.titleKey && (
            <p
              className={cn(
                "px-3 pb-1.5 text-[10px] text-muted-foreground/60",
                rtl ? "" : "uppercase tracking-[0.18em]"
              )}
            >
              {t(group.titleKey)}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {group.items.map((s) => {
              const on = isActive(pathname, s.href);
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
                    <span
                      className={cn(
                        "grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-semibold",
                        s.href === "/admin/reports"
                          ? "bg-destructive text-white"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminMobileNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const openReports = useOpenReportsCount();

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden [scrollbar-width:none]">
      {SECTIONS.map((s) => {
        const on = isActive(pathname, s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            data-cursor="hover"
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs transition-colors",
              on ? "border-primary/50 bg-primary/[0.08] text-foreground" : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            <s.icon className={cn("size-3.5", on && "text-primary")} strokeWidth={1.7} />
            {t(s.labelKey)}
            {s.href === "/admin/reports" && openReports > 0 && (
              <span className="grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-white">
                {openReports}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
