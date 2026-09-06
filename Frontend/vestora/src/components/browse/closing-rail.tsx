"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { VentureImage } from "@/components/browse/venture-image";
import { EASE, stepDelay } from "@/lib/browse/motion";
import { commitmentPct, commitmentRatio } from "@/lib/browse/signals";
import { compactUsd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ProjectCard } from "@/lib/types/api";

/** A round is worth flagging once most of it is spoken for but it is still open. */
const CLOSING_THRESHOLD = 0.75;
const MAX_SHOWN = 8;

export function closingSoon(items: ProjectCard[]): ProjectCard[] {
  return items
    .filter((p) => !p.isFullyCommitted && commitmentRatio(p) >= CLOSING_THRESHOLD)
    .sort((a, b) => commitmentRatio(b) - commitmentRatio(a))
    .slice(0, MAX_SHOWN);
}

/**
 * The rounds closest to closing, as a rail.
 *
 * The grid answers "what exists"; it cannot answer "what is about to stop being
 * available", because a card at 91% and a card at 4% look identical in it. This
 * is the one place on the page where the ordering itself is the information, so
 * it reads horizontally at a different density from everything around it — the
 * change in pace is what stops thirty-five plates from becoming wallpaper.
 *
 * Every venture here also appears in the grid below. Nothing is only reachable
 * from a rail, and nothing here depends on hover to be understood.
 */
export function ClosingRail({ items }: { items: ProjectCard[] }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  if (items.length < 2) return null;

  return (
    <section aria-labelledby="closing-heading" className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          id="closing-heading"
          className={cn("text-2xl font-bold sm:text-[1.75rem]", rtl ? "" : "tracking-[-0.02em]")}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("browse.closing.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("browse.closing.sub")}</p>
      </div>

      {/* Horizontal by design: the sequence carries meaning, so the eye should
          travel along it rather than wrap into rows. */}
      <ul
        className={cn(
          "themed-scroll mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4",
          "[scrollbar-gutter:stable]"
        )}
      >
        {items.map((p, i) => {
          const pct = commitmentPct(p);
          const left = Math.max(0, p.investmentNeeded - p.committedAmount);
          return (
            <motion.li
              key={p.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: stepDelay(i), ease: EASE }}
              className="w-[16.5rem] shrink-0 snap-start"
            >
              <Link
                href={`/projects/${p.id}`}
                data-cursor="hover"
                className="plate group/rail block h-full outline-none transition-transform duration-500 ease-out motion-safe:hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <span className="plate-face flex h-full flex-col">
                  <span className="relative block aspect-[16/9] w-full overflow-hidden bg-secondary">
                    <VentureImage
                      imageId={p.coverImageId}
                      name={p.name}
                      sizes="17rem"
                      className="h-full w-full object-cover transition-transform duration-[900ms] ease-out motion-safe:group-hover/rail:scale-[1.05]"
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent"
                    />
                    {/* The number is the reason this venture is in the rail, so it
                        sits on the image rather than waiting below the fold. */}
                    <span className="absolute bottom-2.5 end-3 font-numeric text-lg font-bold text-[#f0eae0]">
                      {pct}%
                    </span>
                  </span>

                  <span className="flex flex-1 flex-col gap-2 p-4">
                    <span
                      className="line-clamp-1 text-sm font-bold leading-tight transition-colors duration-300 group-hover/rail:text-primary"
                      style={{ fontFamily: "var(--font-heading)" }}
                      title={p.name}
                    >
                      {p.name}
                    </span>

                    <span aria-hidden className="mt-auto block h-1 w-full overflow-hidden rounded-full bg-secondary">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-bronze to-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </span>

                    <span className="font-numeric text-[11px] text-muted-foreground">
                      {t("browse.closing.remaining").replace("{v}", compactUsd(left))}
                    </span>
                  </span>
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
