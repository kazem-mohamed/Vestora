"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { KeyRound, UserRound } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", labelKey: "pset.tab.profile", icon: UserRound },
  { href: "/settings/account", labelKey: "pset.tab.account", icon: KeyRound },
];

/**
 * Settings is two distinct jobs: how you appear to others, and how your account
 * is secured. They were one page (profile only), which left changing a password
 * with nowhere to live even though the endpoint has always existed.
 */
export function SettingsTabs() {
  const { t } = useLocale();
  const pathname = usePathname();
  const reduce = useReducedMotion() ?? false;

  return (
    <nav
      aria-label={t("nav.settings")}
      className="flex items-center gap-1 rounded-full border border-border/70 bg-card/40 p-1 backdrop-blur-sm"
    >
      {TABS.map((tab) => {
        const on = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-cursor="hover"
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm outline-none transition-colors duration-300",
              "focus-visible:ring-3 focus-visible:ring-ring/25",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {on && (
              <motion.span
                layoutId="settings-tab"
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-foreground/[0.06] ring-1 ring-border/70"
              />
            )}
            <span className="relative flex items-center gap-2">
              <tab.icon className={cn("size-4", on && "text-primary")} strokeWidth={1.7} />
              {t(tab.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
