"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Compass,
  LifeBuoy,
  Mail,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { CustomCursor } from "@/components/motion/cursor";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { SOCIAL_LINKS } from "@/lib/config/social";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Questions grouped by the situation someone is actually in when they ask them.
 * Grouping by role beats grouping by feature: a founder and an investor arrive with
 * completely different confusions about the same mechanic.
 */
const GROUPS = [
  { id: "basics", icon: Compass, count: 4 },
  { id: "founders", icon: Sparkles, count: 4 },
  { id: "investors", icon: LifeBuoy, count: 4 },
  { id: "trust", icon: ShieldAlert, count: 4 },
] as const;

/**
 * Help.
 *
 * FAQ and Contact are one surface, not two. "I don't understand something" and "I need to
 * tell someone" are the same visit — splitting them means a person reads an answer, still
 * needs a human, and has to go hunting for a second page. The answers come first because
 * most questions are already answered; the way to reach a person sits at the end, where
 * someone who has exhausted the answers will look.
 *
 * Vestora has no ticketing system and no support inbox beyond email, so this page does
 * not pretend to: there is no fake contact form promising a response time nobody has
 * committed to. It offers the routes that genuinely exist.
 */
export default function HelpPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState<string | null>("basics-1");

  return (
    <div className="cursor-showpiece relative min-h-svh overflow-x-clip bg-background text-foreground">
      <CustomCursor />
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 sm:px-10">
        {/* ================= MASTHEAD ================= */}
        <section className="pt-16 sm:pt-20">
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className={cn("text-xs text-primary", rtl ? "" : "uppercase tracking-[0.35em]")}
          >
            {t("help.eyebrow")}
          </motion.p>

          <span className="mt-5 block overflow-hidden pb-1">
            <motion.h1
              initial={reduce ? { opacity: 0 } : { y: "110%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: EASE }}
              className={cn(
                "max-w-2xl text-4xl font-bold sm:text-5xl",
                rtl ? "leading-[1.28]" : "leading-[1.05] tracking-[-0.02em]"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("help.title")}
            </motion.h1>
          </span>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.24, ease: EASE }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
          >
            {t("help.sub")}
          </motion.p>
        </section>

        {/* ================= ANSWERS ================= */}
        <div className="mt-14 space-y-12">
          {GROUPS.map((group, gi) => {
            const Icon = group.icon;
            return (
              <motion.section
                key={group.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, delay: (gi % 4) * 0.05, ease: EASE }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/25 text-primary">
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                  <h2
                    className="text-lg font-bold sm:text-xl"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {t(`help.group.${group.id}`)}
                  </h2>
                </div>

                <div className="mt-5 divide-y divide-border/50 border-y border-border/50">
                  {Array.from({ length: group.count }, (_, i) => {
                    const key = `${group.id}-${i + 1}`;
                    const isOpen = open === key;
                    return (
                      <div key={key}>
                        <h3>
                          <button
                            type="button"
                            data-cursor="hover"
                            aria-expanded={isOpen}
                            aria-controls={`answer-${key}`}
                            id={`question-${key}`}
                            onClick={() => setOpen(isOpen ? null : key)}
                            className={cn(
                              "group/q flex w-full items-start gap-4 py-5 text-start outline-none",
                              "transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/25"
                            )}
                          >
                            <span
                              className={cn(
                                "min-w-0 flex-1 text-[15px] transition-colors duration-300",
                                isOpen
                                  ? "text-primary"
                                  : "text-foreground/90 group-hover/q:text-foreground"
                              )}
                            >
                              {t(`help.q.${key}`)}
                            </span>
                            <motion.span
                              animate={reduce ? undefined : { rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.35, ease: EASE }}
                              className={cn(
                                "mt-0.5 shrink-0 transition-colors duration-300",
                                isOpen ? "text-primary" : "text-muted-foreground"
                              )}
                            >
                              <ChevronDown className="size-4" strokeWidth={2} />
                            </motion.span>
                          </button>
                        </h3>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              id={`answer-${key}`}
                              role="region"
                              aria-labelledby={`question-${key}`}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
                              className="overflow-hidden"
                            >
                              <p className="border-s-2 border-primary/30 pb-6 ps-4 text-sm leading-[1.75] text-muted-foreground">
                                {t(`help.a.${key}`)}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>

        {/* ================= POLICY POINTERS ================= */}
        <motion.section
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.65, ease: EASE }}
          className="mt-16"
        >
          <p
            className={cn(
              "text-[10px] text-muted-foreground",
              rtl ? "" : "uppercase tracking-[0.22em]"
            )}
          >
            {t("help.policies")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { slug: "risk", key: "legal.risk.nav" },
              { slug: "privacy", key: "land.foot.privacy" },
              { slug: "guidelines", key: "legal.guidelines.nav" },
              { slug: "terms", key: "register.terms.link" },
            ].map((p) => (
              <Link
                key={p.slug}
                href={`/legal/${p.slug}`}
                data-cursor="hover"
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs outline-none",
                  "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
                  "focus-visible:ring-3 focus-visible:ring-ring/25"
                )}
              >
                {t(p.key)}
                <Arrow className="size-3" />
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ================= CONTACT ================= */}
        <motion.section
          id="contact"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.75, ease: EASE }}
          className="relative mt-16 scroll-mt-28 overflow-hidden rounded-[1.6rem] border border-border bg-card/50 p-7 backdrop-blur-sm sm:p-10"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />

          <h2
            className={cn(
              "text-2xl font-bold sm:text-3xl",
              rtl ? "leading-[1.4]" : "leading-tight tracking-[-0.015em]"
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t("help.contact.title")}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {t("help.contact.body")}
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl bg-border/40 sm:grid-cols-2">
            {/* Email — the one channel that genuinely exists. */}
            <a
              href="mailto:support@vestora.app"
              data-cursor="hover"
              className="group/ch flex items-start gap-3.5 bg-background/40 p-5 outline-none transition-colors duration-300 hover:bg-primary/[0.04] focus-visible:ring-3 focus-visible:ring-ring/25"
            >
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.8} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground transition-colors group-hover/ch:text-primary">
                  {t("help.contact.email")}
                </span>
                <span className="font-numeric mt-1 block truncate text-xs text-muted-foreground">
                  support@vestora.app
                </span>
              </span>
            </a>

            {/* In-product reporting, which is the right route for anything about a
                specific venture — it arrives with context a support email would lack. */}
            <div className="flex items-start gap-3.5 bg-background/40 p-5">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-bronze" strokeWidth={1.8} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {t("help.contact.report")}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {t("help.contact.reportBody")}
                </span>
              </span>
            </div>
          </div>

          {/* Signed-in members get the account routes they are most likely wanting. */}
          {user && (
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                href="/settings/account"
                data-cursor="hover"
                className="link-underline text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("help.contact.accountSettings")}
              </Link>
              <Link
                href="/messages"
                data-cursor="hover"
                className="link-underline text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("help.contact.messages")}
              </Link>
            </div>
          )}

          {SOCIAL_LINKS.length > 0 && (
            <p className="mt-7 text-xs text-muted-foreground/80">
              {t("help.contact.social")}{" "}
              {SOCIAL_LINKS.map((s, i) => (
                <span key={s.name}>
                  {i > 0 && " · "}
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="hover"
                    className="link-underline text-foreground transition-colors hover:text-primary"
                  >
                    {s.name}
                  </a>
                </span>
              ))}
            </p>
          )}
        </motion.section>
      </main>

      <Footer variant="compact" />
    </div>
  );
}
