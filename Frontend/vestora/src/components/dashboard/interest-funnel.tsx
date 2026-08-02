"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bookmark, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FunnelStage, StalledRelationship } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The interest funnel.
 *
 * The analytics page already reported views, unique visitors and a conversion rate as
 * three unrelated figures — which tells a founder how they are doing but never where
 * they are losing people. The same counts arranged as stages, each one a distinct-people
 * count, turn into the one question a founder can act on: which step is the cliff.
 *
 * Rendered as receding bars rather than a chart library. Each stage sits a little
 * further back in Z and its bar is scaled from the widest stage, so the shape of the
 * drop is legible before any number is read — and it costs nothing but CSS, on a page
 * that already loads Recharts for two area charts.
 */
export function InterestFunnel({
  funnel,
  declined,
  stalled,
}: {
  funnel: FunnelStage[];
  declined: number;
  stalled: StalledRelationship[];
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;

  /**
   * Saving is not a gate.
   *
   * The API returns five stages in order, but only four of them are sequential: someone
   * can ask to back a venture without ever bookmarking it, and on live data this
   * happens constantly — one listing showed 0 saves against 4 requests. Left in line,
   * "saved" made the drop arithmetic lie twice over: it reported 46 people lost at a
   * step 4 of them had skipped, and it named the wrong step as the cliff. So saves are
   * pulled out and shown alongside the funnel as the parallel signal they are.
   */
  const saved = funnel.find((f) => f.key === "saved") ?? null;
  const gates = funnel.filter((f) => f.key !== "saved");

  const top = Math.max(...gates.map((f) => f.count), 1);

  // The steepest drop between two stages that genuinely follow one another.
  let worst: { from: FunnelStage; to: FunnelStage; lost: number } | null = null;
  for (let i = 0; i < gates.length - 1; i++) {
    const lost = gates[i].count - gates[i + 1].count;
    if (lost > 0 && (!worst || lost > worst.lost)) {
      worst = { from: gates[i], to: gates[i + 1], lost };
    }
  }

  const anyInterest = funnel.some((f) => f.count > 0);

  return (
    <div
      className="relative"
      style={{ perspective: reduce ? undefined : "1100px" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          {t("funnel.title")}
        </h3>
        {declined > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {t("funnel.declined")}{" "}
            <span className="font-numeric text-foreground">{declined}</span>
          </p>
        )}
      </div>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
        {t("funnel.sub")}
      </p>

      {!anyInterest ? (
        <p className="mt-6 rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-xs text-muted-foreground">
          {t("funnel.empty")}
        </p>
      ) : (
        <ol
          className="mt-6 space-y-2.5"
          style={{ transformStyle: reduce ? undefined : "preserve-3d" }}
        >
          {gates.map((stage, i) => {
            const ratio = stage.count / top;
            const prev = i > 0 ? gates[i - 1].count : null;
            // Share of the step above, which is the only comparison that means
            // anything — a percentage of total views flatters every later stage.
            const carry = prev && prev > 0 ? Math.round((stage.count / prev) * 100) : null;
            const isWorst = worst?.to.key === stage.key;

            return (
              <motion.li
                key={stage.key}
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: 14, transform: "translateZ(-40px)" }
                }
                whileInView={{ opacity: 1, y: 0, transform: "translateZ(0px)" }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
                className="relative"
                // Each stage sits marginally further back than the one above it, so
                // the funnel has real depth rather than a drawn illusion of it.
                style={
                  reduce ? undefined : { transform: `translateZ(${-i * 9}px)` }
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs text-foreground/90">{t(`funnel.stage.${stage.key}`)}</p>
                  <p className="flex shrink-0 items-baseline gap-2">
                    <span className="font-numeric text-sm text-foreground">
                      <AnimatedNumber value={stage.count} format={(v) => String(v)} />
                    </span>
                    {carry != null && (
                      <span
                        className={cn(
                          "font-numeric text-[10px]",
                          isWorst ? "text-destructive" : "text-muted-foreground"
                        )}
                      >
                        {carry}%
                      </span>
                    )}
                  </p>
                </div>

                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-foreground/[0.05]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: ratio }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      duration: reduce ? 0 : 0.9,
                      delay: reduce ? 0 : 0.15 + i * 0.08,
                      ease: EASE,
                    }}
                    className={cn(
                      "h-full rounded-full",
                      // The stage where interest is lost wears the warning colour;
                      // everything else stays in the house palette.
                      isWorst
                        ? "bg-gradient-to-r from-destructive/70 to-destructive/40"
                        : "bg-gradient-to-r from-primary/80 to-bronze/50"
                    )}
                    style={{
                      transformOrigin: rtl ? "right center" : "left center",
                    }}
                  />
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}

      {/* Saves, beside the funnel rather than inside it. Interest that never became a
          request is worth knowing about; calling it a stage people "failed" is not. */}
      {saved && anyInterest && (
        <p className="mt-5 flex items-baseline gap-2 border-t border-border/50 pt-4 text-xs text-muted-foreground">
          <Bookmark className="size-3.5 shrink-0 self-center text-bronze" strokeWidth={1.9} />
          <span>{t("funnel.saved.aside")}</span>
          <span className="font-numeric text-foreground">{saved.count}</span>
        </p>
      )}

      {worst && (
        <p className="mt-5 flex items-start gap-2 border-s-2 border-destructive/40 ps-3 text-xs leading-relaxed text-muted-foreground">
          <TrendingDown className="mt-0.5 size-3.5 shrink-0 text-destructive" strokeWidth={1.9} />
          <span>
            {t("funnel.biggestDrop")
              .replace("{from}", t(`funnel.stage.${worst.from.key}`))
              .replace("{to}", t(`funnel.stage.${worst.to.key}`))
              .replace("{count}", String(worst.lost))}
          </span>
        </p>
      )}

      {/* The actionable half: approved backers nobody has followed up with. A funnel
          that only describes the past is a report; this is the part a founder can fix
          today, so it sits inside the same block rather than in a panel of its own. */}
      {stalled.length > 0 && (
        <div className="mt-7 border-t border-border/60 pt-5">
          <h4 className="text-xs font-semibold text-foreground">{t("funnel.stalled.title")}</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t("funnel.stalled.sub")}
          </p>
          <ul className="mt-3 space-y-1">
            {stalled.slice(0, 4).map((s) => (
              <li key={s.investmentId}>
                <Link
                  href={`/deals/${s.investmentId}`}
                  data-cursor="hover"
                  className="group/st flex items-center gap-3 rounded-lg px-2 py-2 outline-none transition-colors duration-300 hover:bg-foreground/[0.04] focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground/90">
                    {s.investorName}
                  </span>
                  <span className="font-numeric shrink-0 text-[11px] text-bronze">
                    {t("funnel.stalled.days").replace("{n}", String(s.daysWaiting))}
                  </span>
                  <Arrow
                    className={cn(
                      "size-3 shrink-0 text-muted-foreground/0 transition-[color,transform] duration-300 group-hover/st:text-primary",
                      rtl
                        ? "group-hover/st:-translate-x-0.5"
                        : "group-hover/st:translate-x-0.5"
                    )}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
