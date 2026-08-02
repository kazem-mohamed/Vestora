"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, Menu, Settings, User, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { navLinksFor, roleLabelKeyFor } from "@/lib/nav/role-nav";
import { authApi } from "@/lib/api/auth";
import { avatarUrl } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The product's navigation below `md`.
 *
 * Until now there was none: HeaderNav is `hidden md:flex`, so on a phone a
 * signed-in investor who opened a venture from their suite had no way back to
 * it. The per-role pill rails live *inside* each shell, which only helps once
 * you are already there.
 *
 * Opens as a full-height panel from the reading edge, with the same house curve
 * and gold hairline the rest of the product uses.
 */
export function MobileNav() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [open, setOpen] = useState(false);

  async function signOut() {
    try {
      await authApi.logout();
    } catch {
      /* clearing locally is enough even if the call fails */
    }
    clearSession();
    setOpen(false);
    router.push("/login");
  }

  const links = navLinksFor(user);

  // Every destination in here closes the panel on its way out, so it never
  // lingers over the page it just navigated to.
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/projects" ? pathname === "/projects" : pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("nav.menu")}
        aria-expanded={open}
        data-cursor="hover"
        className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.7} />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm md:hidden"
                />

                <motion.nav
                  aria-label={t("nav.menu")}
                  initial={reduce ? { opacity: 0 } : { x: rtl ? "-100%" : "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: rtl ? "-100%" : "100%" }}
                  transition={{ duration: 0.44, ease: EASE }}
                  className="fixed inset-y-0 end-0 z-50 flex w-[86%] max-w-sm flex-col bg-background shadow-2xl md:hidden"
                >
                  {/* Gold hairline on the leading edge — the drawer signature. */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 start-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent"
                  />

                  <div className="flex items-center justify-between px-6 pt-6">
                    <Logo />
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label={t("nav.menu.close")}
                      className="grid size-11 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* The same identity plate the account menu shows on a pointer device —
                      avatar, name, role — so the drawer is not a plainer account surface
                      just because it is the one phones get. */}
                  {user && (
                    <div className="mt-6 flex items-center gap-3 px-6">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-primary/30">
                        <img
                          src={avatarUrl(user.id)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-semibold leading-tight"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {user.userName}
                        </p>
                        <span
                          className={cn(
                            "mt-1 inline-block rounded-full border border-primary/25 px-2 py-px text-[10px] text-primary",
                            rtl ? "" : "uppercase tracking-[0.14em]"
                          )}
                        >
                          {t(roleLabelKeyFor(user))}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 px-6">
                    <div className="h-px w-full bg-gradient-to-r from-primary/40 to-transparent" />
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-5">
                    {links.map((l, i) => {
                      const on = isActive(l.href);
                      return (
                        <motion.div
                          key={l.href}
                          initial={reduce ? false : { opacity: 0, x: rtl ? -14 : 14 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.06 + i * 0.045, ease: EASE }}
                        >
                          <Link
                            href={l.href}
                            onClick={close}
                            data-cursor="hover"
                            aria-current={on ? "page" : undefined}
                            className={cn(
                              "flex min-h-12 items-center gap-3.5 rounded-xl px-3 text-[15px] transition-colors",
                              on
                                ? "bg-primary/[0.08] text-foreground"
                                : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                            )}
                          >
                            <l.icon
                              className={cn("size-[18px] shrink-0", on && "text-primary")}
                              strokeWidth={1.7}
                            />
                            <span className="flex-1">{t(l.labelKey)}</span>
                            {on && (
                              <motion.span
                                layoutId="mobile-nav-active"
                                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                                className="h-5 w-0.5 rounded-full bg-primary"
                              />
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="border-t border-border px-4 py-4">
                    {user ? (
                      <>
                        <MenuRow
                          href={`/u/${user.id}`}
                          icon={User}
                          label={t("nav.profile")}
                          delay={0.24}
                          reduce={reduce}
                          rtl={rtl}
                          onNavigate={close}
                        />
                        <MenuRow
                          href="/settings/profile"
                          icon={Settings}
                          label={t("nav.settings")}
                          delay={0.28}
                          reduce={reduce}
                          rtl={rtl}
                          onNavigate={close}
                        />
                        <button
                          type="button"
                          onClick={signOut}
                          data-cursor="hover"
                          className="flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3 text-[15px] text-destructive transition-colors hover:bg-destructive/[0.07]"
                        >
                          <LogOut className="size-[18px] shrink-0" strokeWidth={1.7} />
                          {t("nav.logout")}
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2.5 px-1 pb-1">
                        <Link
                          href="/register"
                          onClick={close}
                          className="gold-cta flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                        >
                          {t("home.cta.request")}
                        </Link>
                        <Link
                          href="/login"
                          onClick={close}
                          className="flex min-h-12 w-full items-center justify-center rounded-full border border-border text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t("nav.login")}
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.nav>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
  delay,
  reduce,
  rtl,
  onNavigate,
}: {
  href: string;
  icon: typeof User;
  label: string;
  delay: number;
  reduce: boolean;
  rtl: boolean;
  onNavigate: () => void;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: rtl ? -12 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
    >
      <Link
        href={href}
        onClick={onNavigate}
        data-cursor="hover"
        className="flex min-h-12 items-center gap-3.5 rounded-xl px-3 text-[15px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
      >
        <Icon className="size-[18px] shrink-0" strokeWidth={1.7} />
        {label}
      </Link>
    </motion.div>
  );
}
