"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { EASE } from "@/lib/browse/motion";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Shown only to signed-out visitors, and only AFTER they have seen the ventures.
 * Browse now sells itself; this is the step that follows, not the toll gate that
 * used to stand in front of it.
 */
export function GuestInvite() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  return (
    <motion.aside
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, ease: EASE }}
      className="relative mt-20 overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/40 px-8 py-12 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(60% 90% at 50% 0%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">
        <p
          className={cn(
            "text-[11px] text-primary",
            rtl ? "" : "uppercase tracking-[0.28em]"
          )}
        >
          {t("browse.guest.eyebrow")}
        </p>
        <h2
          className={cn(
            "mx-auto mt-4 max-w-lg text-2xl font-bold sm:text-3xl",
            rtl ? "leading-[1.5]" : "leading-tight"
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("browse.guest.title")}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {t("browse.guest.body")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            data-cursor="hover"
            className="gold-cta group/cta inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-transform duration-300 focus-visible:ring-3 focus-visible:ring-ring/40 motion-safe:hover:-translate-y-0.5"
          >
            {t("browse.guest.cta")}
            <ArrowUpRight
              className={cn(
                "size-4 transition-transform duration-300 motion-safe:group-hover/cta:translate-x-0.5 motion-safe:group-hover/cta:-translate-y-0.5",
                rtl && "-scale-x-100"
              )}
            />
          </Link>
          <Link
            href="/login"
            data-cursor="hover"
            className="rounded-full border border-border px-7 py-3.5 text-sm text-muted-foreground outline-none transition-colors duration-300 hover:border-primary/50 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            {t("browse.guest.signin")}
          </Link>
        </div>
      </div>
    </motion.aside>
  );
}
