"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CustomCursor } from "@/components/motion/cursor";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { LEGAL_DOCUMENTS, type LegalDocument } from "@/lib/legal/documents";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The reader for every Vestora policy document.
 *
 * These are long, dense, and read under pressure — someone opening Risk Disclosure is
 * usually about to commit money. So the design serves reading rather than decoration: a
 * measured column, generous leading, real section anchors, and a rail that tracks where
 * you are.
 *
 * The one flourish is a progress hairline at the top of the viewport. It answers the
 * question people actually have in a legal document ("how much more of this is there"),
 * which makes it information rather than ornament.
 */
export function LegalReader({ doc }: { doc: LegalDocument }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Back = rtl ? ArrowRight : ArrowLeft;
  const reduce = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.3 });

  const [active, setActive] = useState<string>(doc.sections[0]?.id ?? "");

  // Track the section in view for the rail. IntersectionObserver rather than a scroll
  // listener so this costs nothing while idle.
  useEffect(() => {
    const marks = doc.sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (marks.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // Bias the band to the upper third so the rail changes as a heading arrives,
      // not once it has already scrolled past.
      { rootMargin: "-12% 0px -70% 0px", threshold: 0 }
    );

    marks.forEach((m) => io.observe(m));
    return () => io.disconnect();
  }, [doc.sections]);

  return (
    <div className="cursor-showpiece relative min-h-svh bg-background text-foreground">
      <CustomCursor />
      <SiteHeader />

      {/* Reading progress — the one piece of chrome a long document genuinely needs. */}
      {!reduce && (
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className={cn(
            "fixed inset-x-0 top-0 z-50 h-[2px] bg-gradient-to-r from-bronze to-primary",
            rtl ? "origin-right" : "origin-left"
          )}
        />
      )}

      <div className="mx-auto w-full max-w-6xl px-6 pb-24 sm:px-10">
        {/* ---- Masthead ---- */}
        <motion.header
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: EASE }}
          className="border-b border-border/60 pb-12 pt-16 sm:pt-20"
        >
          <Link
            href="/legal"
            data-cursor="hover"
            className={cn(
              "link-underline inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground",
              rtl ? "" : "uppercase tracking-[0.2em]"
            )}
          >
            <Back className="size-3.5" />
            {t("legal.allDocuments")}
          </Link>

          <span className="mt-6 block overflow-hidden pb-1">
            <motion.h1
              initial={reduce ? { opacity: 0 } : { y: "110%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              transition={{ duration: 0.95, delay: 0.1, ease: EASE }}
              className={cn(
                "max-w-3xl text-4xl font-bold sm:text-5xl",
                rtl ? "leading-[1.3]" : "leading-[1.06] tracking-[-0.02em]"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {doc.title}
            </motion.h1>
          </span>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {doc.summary}
          </p>

          <p className="font-numeric mt-6 text-xs text-muted-foreground/70">
            {t("legal.updated").replace("{date}", doc.updated)}
          </p>
        </motion.header>

        {/* ---- Rail + body ---- */}
        <div className="grid gap-12 pt-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          {/* Contents rail. Sticky on desktop; a plain list above the text on mobile,
              because a sticky rail on a phone eats the reading area it is meant to serve. */}
          <nav aria-label={t("legal.contents")} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p
              className={cn(
                "text-[10px] text-muted-foreground",
                rtl ? "" : "uppercase tracking-[0.22em]"
              )}
            >
              {t("legal.contents")}
            </p>
            <ol className="mt-4 space-y-1">
              {doc.sections.map((s, i) => {
                const on = active === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      data-cursor="hover"
                      className={cn(
                        "group/toc flex gap-2.5 rounded-lg py-1.5 text-xs outline-none transition-colors duration-300",
                        "focus-visible:ring-3 focus-visible:ring-ring/25",
                        on ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="font-numeric shrink-0 opacity-60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">{s.heading}</span>
                    </a>
                  </li>
                );
              })}
            </ol>

            {/* Sibling documents, so a reader who realises they wanted a different one
                does not have to go back to the hub. */}
            <div className="mt-8 border-t border-border/60 pt-6">
              <p
                className={cn(
                  "text-[10px] text-muted-foreground",
                  rtl ? "" : "uppercase tracking-[0.22em]"
                )}
              >
                {t("legal.related")}
              </p>
              <ul className="mt-3 space-y-1.5">
                {LEGAL_DOCUMENTS.filter((d) => d.slug !== doc.slug).map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/legal/${d.slug}`}
                      data-cursor="hover"
                      className="link-underline text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {d.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* ---- The document ---- */}
          <article className="min-w-0 max-w-2xl">
            {doc.sections.map((s, i) => (
              <motion.section
                key={s.id}
                id={s.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, ease: EASE }}
                // scroll-mt clears the sticky header when an anchor is followed.
                className="scroll-mt-28 border-b border-border/40 py-10 first:pt-0 last:border-0"
              >
                <p className="font-numeric text-xs text-primary">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2
                  className={cn(
                    "mt-3 text-xl font-bold sm:text-2xl",
                    rtl ? "leading-[1.4]" : "leading-snug tracking-[-0.01em]"
                  )}
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {s.heading}
                </h2>

                <div className="mt-5 space-y-4">
                  {s.body.map((p, j) => (
                    <p
                      key={j}
                      className="text-[15px] leading-[1.75] text-foreground/85"
                      style={{ fontFamily: "var(--font-reading, inherit)" }}
                    >
                      {p}
                    </p>
                  ))}
                </div>

                {/* The emphasised statement, set as an engraved aside rather than bold
                    text — it is the sentence that matters most in the section. */}
                {s.note && (
                  <p className="mt-6 border-s-2 border-primary/40 bg-primary/[0.035] py-3 ps-4 pe-3 text-sm leading-relaxed text-foreground/90">
                    {s.note}
                  </p>
                )}
              </motion.section>
            ))}

            {/* Closing note — states what this document is and is not. */}
            <p className="mt-10 rounded-xl border border-dashed border-border bg-background/40 px-4 py-3.5 text-xs leading-relaxed text-muted-foreground">
              {t("legal.disclaimer")}
            </p>
          </article>
        </div>
      </div>

      <Footer variant="compact" />
    </div>
  );
}
