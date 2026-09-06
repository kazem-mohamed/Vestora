"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MoreHorizontal } from "lucide-react";
import { navLinksFor } from "@/lib/nav/role-nav";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/** Four destinations plus the menu. Past five, a bar stops being scannable. */
const PRIMARY_SLOTS = 4;

function isActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0];
  if (path === "/projects") {
    // "Browse" and "Saved" both point at /projects; only the plain one owns it.
    return pathname === "/projects" && !href.includes("saved");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * The product's primary navigation on a phone.
 *
 * Until now the only way to move between sections on mobile was a hamburger at
 * the top of the screen — the corner furthest from a thumb, behind a tap that
 * hides the destinations until you ask for them. A bar puts the same
 * destinations permanently in reach and, more importantly, shows where you
 * currently are without opening anything.
 *
 * Sourced from the same `navLinksFor` the desktop header uses, so a role can
 * never be offered a destination in one surface and denied it in another.
 */
export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);


  const links = navLinksFor(user).slice(0, PRIMARY_SLOTS);
  // A single destination is not a navigation bar — a signed-out visitor gets
  // the header's own links instead of a bar with one item in it.
  const shown = links.length >= 2;

  // The bar is fixed, so it would otherwise cover the last rows of every list in
  // the product. Flagging the body lets one stylesheet rule reserve its height
  // at the end of the document — and only while a bar is actually mounted.
  useEffect(() => {
    if (!shown) return;
    document.body.dataset.bottomNav = "true";
    return () => {
      delete document.body.dataset.bottomNav;
    };
  }, [shown]);

  if (!shown) return null;

  return (
    <nav
      aria-label={t("nav.primary")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        // The blur keeps the page legible as it scrolls underneath rather than
        // dropping an opaque slab over the last row of content.
        "border-t border-border/70 bg-background/85 backdrop-blur-xl",
        "pad-safe-b"
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {links.map((link) => {
          const active = isActive(pathname, link.href);
          const Icon = link.icon;
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 outline-none",
                  "transition-colors duration-300",
                  "focus-visible:ring-3 focus-visible:ring-ring/30",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* A hairline over the active item. This was a shared-layout
                    element so the marker could travel between tabs, but framer
                    writes an inline height during that animation and rendered it
                    as a 40px slab; a route change remounts the bar anyway, so the
                    travel was never actually visible. */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-primary"
                  />
                )}
                <Icon className="size-[22px] shrink-0" strokeWidth={active ? 2 : 1.7} aria-hidden />
                <span className="line-clamp-1 text-[10.5px] font-medium leading-none">
                  {t(link.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}

        <li className="flex-1">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={t("nav.menu")}
            className={cn(
              "flex min-h-[52px] w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 outline-none",
              "text-muted-foreground transition-colors duration-300",
              "focus-visible:ring-3 focus-visible:ring-ring/30"
            )}
          >
            <MoreHorizontal className="size-[22px] shrink-0" strokeWidth={1.7} aria-hidden />
            <span className="text-[10.5px] font-medium leading-none">{t("nav.more")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
