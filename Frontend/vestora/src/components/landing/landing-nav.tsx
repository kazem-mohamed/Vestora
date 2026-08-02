"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLenis } from "lenis/react";
import { Logo } from "@/components/brand/logo";
import { Magnetic } from "@/components/motion/magnetic";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLocale } from "@/lib/i18n/locale";
import { homeFor, homeLabelKeyFor } from "@/lib/nav/role-nav";
import { ProfileMenu } from "@/components/profile/profile-menu";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
// Scroll order on the page: Hero, Stats, About, How it works, Projects,
// Principles, Testimonials — the nav mirrors that order.
const SECTION_IDS = ["stats", "about", "how", "projects", "principles", "testimonials"] as const;

export function LandingNav() {
  const { t, locale } = useLocale();
  const lenis = useLenis();
  const reduce = useReducedMotion();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = status === "authenticated";
  const track = locale === "ar" ? "" : "uppercase tracking-[0.14em]";

  // Solidifies from a transparent overlay into a grounded bar once the hero
  // has scrolled past — same signal Vercel/Linear use, driven by Motion's
  // scroll value (no raw `window.addEventListener("scroll")`).
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (latest) => setSolid(latest > 40));

  // Section drawer for everything under `lg`, where the inline index is hidden.
  const [menuOpen, setMenuOpen] = useState(false);

  // Lightweight scrollspy: highlights whichever section is currently passing
  // the viewport's upper third, so the active link is never a guess.
  const [active, setActive] = useState<string | null>(null);
  const observed = useRef(new Map<string, IntersectionObserverEntry>());

  useEffect(() => {
    const els = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) observed.current.set(entry.target.id, entry);
        const visible = [...observed.current.values()].filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function go(e: React.MouseEvent, id: string) {
    e.preventDefault();
    lenis?.scrollTo(id, { offset: -24 });
  }

  const links = [
    { label: t("land.nav.stats"), id: "#stats" },
    { label: t("land.foot.about"), id: "#about" },
    { label: t("land.nav.how"), id: "#how" },
    { label: t("land.nav.projects"), id: "#projects" },
    { label: t("land.nav.principles"), id: "#principles" },
    { label: t("land.test.eyebrow"), id: "#testimonials" },
  ];

  const goldPill = (href: string, label: string) => (
    <Magnetic className="ms-2">
      <Link
        href={href}
        data-cursor="hover"
        className="gold-cta inline-block whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-16px_var(--primary)]"
      >
        {label}
      </Link>
    </Magnetic>
  );

  return (
    <motion.nav
      initial={reduce ? false : { opacity: 0, y: -18, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: EASE }}
      className={cn(
        // text-foreground is load-bearing, not decorative: it's what makes
        // `currentColor`-based descendants (the Logo's wordmark span + SVG
        // circle fill, both of which inherit rather than set their own
        // color) actually re-resolve against THIS node's token scope. Without
        // it they skip straight past the `dark` class below and inherit
        // body's real-theme color instead, which is invisible over the video
        // whenever the page theme happens to be light.
        "fixed inset-x-0 top-0 z-30 text-foreground",
        // Unsolid = still overlaying the hero's dark cinematic footage, so it
        // must force the dark token scope regardless of the page's actual
        // theme (same rule the hero itself applies to its own content) —
        // otherwise light-mode text renders unreadable over the dark video.
        // Solid = past the hero, sitting on the real page background, so the
        // real theme takes back over.
        !solid && "dark"
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full items-center px-6 transition-[padding,background-color,backdrop-filter,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:px-10 lg:px-14",
          solid ? "py-3.5 bg-background/78 backdrop-blur-xl shadow-[0_1px_0_0_rgba(0,0,0,0.02)]" : "py-6"
        )}
      >
        <div className="flex flex-1 items-center">
          <Link href="/" aria-label="Vestora home" data-cursor="hover" className="shrink-0">
            <Logo />
          </Link>
        </div>

        {/* Was `xl:flex` — a 1280px gate, so the entire section index vanished
            on every tablet and phone and on a 13" laptop, with no menu behind
            it. On a page that runs to fifteen screens on a phone, that left
            scrolling as the only way to navigate. `lg` recovers the laptop;
            the drawer below covers everything under it. */}
        <div className="hidden items-center gap-5 lg:flex xl:gap-6">
          {links.map((l) => {
            const isActive = active === l.id.slice(1);
            return (
              <a
                key={l.id}
                href={l.id}
                onClick={(e) => go(e, l.id)}
                data-cursor="hover"
                className={cn(
                  "link-underline whitespace-nowrap text-[12px] font-medium transition-colors duration-300",
                  track,
                  isActive ? "is-active text-foreground" : "text-foreground/70 hover:text-foreground"
                )}
              >
                {l.label}
              </a>
            );
          })}
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="landing-section-menu"
            aria-label={menuOpen ? t("nav.menu.close") : t("nav.menu")}
            data-cursor="hover"
            className="me-1 grid size-9 place-items-center text-foreground/75 transition-colors duration-300 hover:text-foreground lg:hidden"
          >
            {menuOpen ? (
              <X className="size-5" strokeWidth={1.5} />
            ) : (
              <Menu className="size-5" strokeWidth={1.5} />
            )}
          </button>
          <LanguageToggle />
          <ThemeToggle />
          {isAuthenticated ? (
            /* A signed-in member had exactly one control here — a pill to their
               workspace — which meant the only way to sign out of Vestora was to
               navigate into the app first and find the menu there. The account menu is
               that menu, so it is reused rather than reimplemented: the real logout
               (token revoke, store clear, redirect) already lives inside it, and a
               second implementation is how those three fall out of step. */
            <>
              {goldPill(homeFor(user), t(homeLabelKeyFor(user)))}
              <span className="ms-1.5">
                <ProfileMenu />
              </span>
            </>
          ) : (
            <>
              <Link
                href="/login"
                data-cursor="hover"
                className="link-underline hidden whitespace-nowrap px-2 text-sm text-foreground/70 transition-colors duration-200 hover:text-foreground sm:inline-block"
              >
                {t("nav.login")}
              </Link>
              {goldPill("/register", t("home.cta.request"))}
            </>
          )}
        </div>
      </div>

      {/* Hairline only once solid — echoes SiteHeader's permanent one. */}
      <div
        className={cn(
          "h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent transition-opacity duration-500",
          solid ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Section drawer — the same index the desktop bar carries, as a ruled
          list. It scopes itself to the real theme (`not-dark`) because the nav
          above it may still be forcing dark over the hero footage, while this
          panel sits on its own solid surface. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="landing-section-menu"
            key="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="overflow-hidden bg-background/95 backdrop-blur-xl lg:hidden"
          >
            <ul className="mx-auto flex w-full flex-col px-6 py-2 md:px-10">
              {links.map((l) => {
                const isActive = active === l.id.slice(1);
                return (
                  <li key={l.id} className="border-b border-border/50 last:border-0">
                    <a
                      href={l.id}
                      onClick={(e) => {
                        go(e, l.id);
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 py-3.5 text-[13px] font-medium transition-colors duration-300",
                        track,
                        isActive ? "text-primary" : "text-foreground/75"
                      )}
                    >
                      <span
                        className={cn(
                          "h-px transition-all duration-500",
                          isActive ? "w-6 bg-primary" : "w-3 bg-foreground/25"
                        )}
                      />
                      {l.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
