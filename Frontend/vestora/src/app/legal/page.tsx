"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { CustomCursor } from "@/components/motion/cursor";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { Guilloche } from "@/components/auth/guilloche";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The policy hub.
 *
 * Six documents in one place, ordered by how much a member actually needs them rather
 * than alphabetically — terms and privacy first, then the risk disclosure, then conduct,
 * then the two short technical ones.
 *
 * Presented as an index of numbered entries, not a grid of cards. A card grid implies
 * these are equivalent tiles to browse; a numbered index says they are documents, in an
 * order, meant to be read.
 */
export default function LegalHubPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;

  return (
    <div className="cursor-showpiece relative min-h-svh overflow-x-clip bg-background text-foreground">
      <CustomCursor />
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 sm:px-10">
        {/* ---- Masthead with a receding medallion ---- */}
        <section className="relative isolate pt-16 sm:pt-20">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 300, ease: "linear", repeat: Infinity }}
              className="absolute -end-32 -top-40 size-[520px]"
            >
              <Guilloche className="h-full w-full text-primary/[0.06] dark:text-primary/[0.045]" />
            </motion.div>
          </div>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className={cn("text-xs text-primary", rtl ? "" : "uppercase tracking-[0.35em]")}
          >
            {t("legal.eyebrow")}
          </motion.p>

          <span className="mt-5 block overflow-hidden pb-1">
            <motion.h1
              initial={reduce ? { opacity: 0 } : { y: "110%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: EASE }}
              className={cn(
                "max-w-2xl text-4xl font-bold sm:text-5xl",
                rtl ? "leading-[1.28]" : "leading-[1.06] tracking-[-0.02em]"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {t("legal.title")}
            </motion.h1>
          </span>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.24, ease: EASE }}
            className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
          >
            {t("legal.sub")}
          </motion.p>
        </section>

        {/* ---- The index ---- */}
        <ol className="mt-14 border-t border-border/60">
          {LEGAL_DOCUMENTS.map((doc, i) => (
            <motion.li
              key={doc.slug}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: (i % 6) * 0.05, ease: EASE }}
              className="border-b border-border/60"
            >
              <Link
                href={`/legal/${doc.slug}`}
                data-cursor="hover"
                className={cn(
                  "group/doc flex items-baseline gap-5 py-7 outline-none transition-colors duration-300",
                  "focus-visible:ring-3 focus-visible:ring-ring/25 sm:gap-8"
                )}
              >
                <span className="font-numeric shrink-0 text-xs text-primary/70">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-xl font-bold transition-colors duration-300 group-hover/doc:text-primary sm:text-2xl",
                      rtl ? "leading-[1.4]" : "tracking-[-0.01em]"
                    )}
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {doc.title}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                    {doc.summary}
                  </span>
                </span>

                <Arrow
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-all duration-300",
                    "group-hover/doc:text-primary",
                    rtl ? "group-hover/doc:-translate-x-1" : "group-hover/doc:translate-x-1"
                  )}
                />
              </Link>
            </motion.li>
          ))}
        </ol>

        <p className="mt-10 max-w-xl text-xs leading-relaxed text-muted-foreground">
          {t("legal.disclaimer")}
        </p>
      </main>

      <Footer variant="compact" />
    </div>
  );
}
