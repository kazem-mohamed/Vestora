"use client";

import Link from "next/link";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { HeaderNav } from "@/components/header-nav";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { InboxButton } from "@/components/messages/inbox-button";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { MobileNav } from "@/components/mobile-nav";
import { BottomNav } from "@/components/bottom-nav";
import { navLinksFor } from "@/lib/nav/role-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const user = useAuthStore((s) => s.user);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => setScrolled(latest > 8));

  // With a bottom bar carrying the destinations, the header's hamburger becomes
  // a second door to the same room. It stays for signed-out visitors, who get
  // no bar (one destination is not a navigation).
  const hasBottomNav = navLinksFor(user).length >= 2;

  return (
    <header className="sticky top-0 z-40">
      <div
        className={cn(
          "transition-[background-color,backdrop-filter,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled
            ? "bg-background/82 backdrop-blur-xl shadow-[0_10px_30px_-24px_rgba(0,0,0,0.5)]"
            : "bg-background/60 backdrop-blur-sm"
        )}
      >
        {/* The action cluster below is five controls wide on a phone and cannot shrink
            without losing one of them; the wordmark can. Letting it compress — and
            tightening the row gap on the narrowest screens — is what keeps the header
            inside 375px instead of dragging every authenticated page into a horizontal
            scroll. */}
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <Link
            href="/"
            aria-label="Vestora home"
            data-cursor="hover"
            className="min-w-0 shrink overflow-hidden"
          >
            <Logo />
          </Link>

          <HeaderNav />

          <div className="flex shrink-0 items-center gap-1">
            {/* Actions — only meaningful when signed in. */}
            {user && (
              <>
                <InboxButton />
                <NotificationsBell />
                {/* Hairline divider between actions and preferences. */}
                <span className="mx-1.5 hidden h-5 w-px bg-border sm:block" />
              </>
            )}
            {/* Preferences. */}
            <LanguageToggle />
            <ThemeToggle />
            {/* The drawer carries the same rows on mobile, so the dropdown would
                be a second door to one room. */}
            <span className="hidden md:contents">
              <ProfileMenu />
            </span>
            {/* Below md the nav links collapse into this; without it there is no
                way out of a page on a phone. Its trigger is suppressed once the
                bottom bar is carrying navigation — the panel is then opened from
                there, and one drawer serves both. */}
            <MobileNav open={menuOpen} onOpenChange={setMenuOpen} hideTrigger={hasBottomNav} />
          </div>
        </div>
      </div>

      {/* Signature: a thin gold hairline, engraved-cheque style. Brightens once
          the header lifts off the top of the page. */}
      <div
        className={cn(
          "h-px w-full bg-gradient-to-r from-transparent to-transparent transition-opacity duration-500",
          scrolled ? "via-primary/60 opacity-100" : "via-primary/35 opacity-80"
        )}
      />

      <BottomNav onOpenMenu={() => setMenuOpen(true)} />
    </header>
  );
}
