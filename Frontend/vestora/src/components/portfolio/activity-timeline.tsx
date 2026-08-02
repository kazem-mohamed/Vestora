"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { projectImageUrl } from "@/lib/api/projects";
import { useLocale } from "@/lib/i18n/locale";
import type { InvestmentActivity, Project } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function compactUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Vertical activity feed: a gold line that draws itself as you scroll, with a
 * rich card per movement — project thumbnail, amount, status and a link into
 * the venture. Mounted only once activities exist, so the scroll target ref
 * is present from the first render (see the useScroll gotcha).
 */
export function ActivityTimeline({
  activities,
  projectsByName,
}: {
  activities: InvestmentActivity[];
  projectsByName: Map<string, Project>;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 82%", "end 55%"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });

  const dateFmt = new Intl.DateTimeFormat(rtl ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div ref={ref} className="relative mt-10">
      {/* Track + progress line that draws with scroll */}
      <span aria-hidden className="absolute bottom-4 start-[11px] top-4 w-px bg-border/60" />
      <motion.span
        aria-hidden
        style={{ scaleY }}
        className="absolute bottom-4 start-[11px] top-4 w-px origin-top bg-gradient-to-b from-primary via-primary to-bronze"
      />

      <ol className="space-y-5 ps-10">
        {activities.map((a, i) => {
          const approved = (a.status ?? "Approved").toLowerCase() === "approved";
          const project = projectsByName.get(a.projectName);
          const cover = project?.imageIds[0];
          const share =
            project && project.investmentNeeded > 0
              ? Math.round((a.amount / project.investmentNeeded) * 100)
              : null;

          const card = (
            <div className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card/50 p-4 backdrop-blur-sm transition-[border-color,background-color,transform,box-shadow] duration-500 ease-out group-hover/link:border-primary/40 sm:p-5">
              {/* Thumbnail */}
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-secondary ring-1 ring-border">
                {cover != null ? (
                  <img
                    src={projectImageUrl(cover)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/link:scale-110"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-full w-full items-center justify-center text-xl text-primary/60"
                    style={{
                      fontFamily: "var(--font-heading)",
                      backgroundImage:
                        "radial-gradient(120% 120% at 20% 0%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 65%)",
                    }}
                  >
                    {a.projectName.charAt(0).toUpperCase()}
                  </span>
                )}
              </span>

              {/* Name + meta */}
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-lg font-bold leading-tight transition-colors duration-300 group-hover/link:text-primary"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {a.projectName}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-numeric">{dateFmt.format(new Date(a.date))}</span>
                  {share != null && (
                    <span className="font-numeric">
                      {share}% {t("port.share")}
                    </span>
                  )}
                </span>
              </span>

              {/* Amount + status */}
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="font-numeric text-lg text-bronze sm:text-xl">
                  {compactUsd(a.amount)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                    approved ? "border-primary/40 text-primary" : "border-bronze/40 text-bronze"
                  }`}
                >
                  {approved ? t("port.status.approved") : t("port.status.pending")}
                </span>
              </span>

              {/* Hover affordance */}
              {project && (
                <ArrowUpRight
                  className={`size-4 shrink-0 text-primary opacity-0 transition-[opacity,transform] duration-300 group-hover/link:opacity-100 ${
                    rtl
                      ? "-translate-x-1 -scale-x-100 group-hover/link:translate-x-0"
                      : "translate-x-1 group-hover/link:translate-x-0"
                  }`}
                />
              )}
            </div>
          );

          return (
            <motion.li
              key={`${a.projectName}-${a.date}-${i}`}
              initial={{ opacity: 0, x: rtl ? 22 : -22 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.65, delay: (i % 8) * 0.05, ease: EASE }}
              className="relative"
            >
              {/* Dot on the line */}
              <span className="absolute -start-[35px] top-1/2 flex size-3 -translate-y-1/2 items-center justify-center">
                <span
                  className={`size-2.5 rounded-full ring-4 ring-background ${
                    approved ? "bg-primary" : "bg-bronze"
                  }`}
                />
                {!approved && (
                  <span className="absolute size-2.5 animate-ping rounded-full bg-bronze opacity-60" />
                )}
              </span>

              {project ? (
                <Link
                  href={`/projects/${project.id}`}
                  data-cursor="hover"
                  className="group/link block"
                >
                  {card}
                </Link>
              ) : (
                <div className="group/link">{card}</div>
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
