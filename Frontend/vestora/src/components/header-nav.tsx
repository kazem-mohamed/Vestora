"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinksFor } from "@/lib/nav/role-nav";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export function HeaderNav() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();

  // Same source as the mobile drawer, so the two can never drift apart.
  const links = navLinksFor(user);

  function isActive(href: string): boolean {
    // Browse must not stay lit while you are deeper in a role's shell.
    return href === "/projects" ? pathname === "/projects" : pathname.startsWith(href);
  }

  return (
    <nav className="hidden items-center gap-7 md:flex">
      {links.map((l) => {
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-cursor="hover"
            aria-current={active ? "page" : undefined}
            className={cn(
              "link-underline text-sm transition-colors duration-300",
              active ? "is-active text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(l.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
