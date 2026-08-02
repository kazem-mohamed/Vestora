"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { BookmarkButton } from "@/components/projects/bookmark-button";
import { Tilt } from "@/components/motion/tilt";
import { projectImageUrl } from "@/lib/api/projects";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types/api";

export type BentoVariant = "hero" | "wide" | "std";

function compactUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function ProjectBentoCard({
  project,
  variant = "std",
  className,
}: {
  project: Project;
  variant?: BentoVariant;
  className?: string;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  const pct =
    project.investmentNeeded > 0
      ? Math.min(100, Math.round((project.raisedAmount / project.investmentNeeded) * 100))
      : 0;
  const funded = project.status === "Completed" || pct >= 100;
  const cover = project.imageIds[0];
  const isHero = variant === "hero";
  const isWide = variant === "wide";

  return (
    <motion.article
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 34 },
        show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={cn("group relative h-full", className)}
    >
      <Tilt max={isWide ? 4 : 6} className="h-full">
        <Link
          href={`/projects/${project.id}`}
          data-cursor-text={t("proj.cursor.view")}
          aria-label={project.name}
          className="relative flex h-full min-h-[200px] flex-col justify-end overflow-hidden rounded-[1.4rem] bg-secondary ring-1 ring-border transition-shadow duration-500 ease-out group-hover:shadow-[0_36px_80px_-30px_rgba(0,0,0,0.7)]"
        >
          {/* Cover with scroll parallax + hover zoom (transforms on separate layers). */}
          <motion.div style={{ y }} className="absolute inset-0 scale-[1.12]">
            {cover != null ? (
              <img
                src={projectImageUrl(cover)}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
              />
            ) : (
              <div
                aria-hidden
                className="h-full w-full transition-transform duration-[900ms] ease-out group-hover:scale-105"
                style={{
                  backgroundImage:
                    "radial-gradient(120% 120% at 15% 0%, color-mix(in oklab, var(--primary) 26%, transparent), transparent 55%), radial-gradient(120% 120% at 100% 100%, color-mix(in oklab, var(--bronze) 26%, transparent), transparent 55%)",
                }}
              >
                <span
                  aria-hidden
                  className="absolute bottom-2 left-4 select-none leading-none text-foreground/[0.06]"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: isHero ? "14rem" : "8rem",
                  }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>

          {/* Legibility scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/30 to-transparent" />

          {/* Gold frame that draws on hover */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full">
            <rect
              x="9"
              y="9"
              width="calc(100% - 18px)"
              height="calc(100% - 18px)"
              rx="14"
              fill="none"
              stroke="#c7a968"
              strokeWidth="1"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              className="opacity-0 transition-[stroke-dashoffset,opacity] duration-[1100ms] ease-out group-hover:opacity-80 group-hover:[stroke-dashoffset:0]"
            />
          </svg>

          {/* Top meta */}
          <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-5 text-[#f0eae0]">
            <div className="flex flex-wrap items-center gap-2">
              {project.category && (
                <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] backdrop-blur-sm">
                  {project.category}
                </span>
              )}
              {project.location && (
                <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] text-[#d8cdb8] backdrop-blur-sm">
                  {project.location}
                </span>
              )}
            </div>
            <BookmarkButton projectId={project.id} />
          </div>

          {/* Bottom content */}
          <div className={cn("relative z-10 text-[#f0eae0]", isHero ? "p-7 sm:p-9" : "p-5")}>
            <p
              className={cn(
                "text-[11px]",
                funded ? "text-[#c7a968]" : "text-[#d8cdb8]",
                rtl ? "" : "uppercase tracking-[0.18em]"
              )}
            >
              {funded ? t("proj.card.completed") : t("proj.card.needs")}
            </p>
            <h3
              className={cn(
                "mt-1.5 font-bold leading-tight",
                isHero ? "text-3xl sm:text-4xl" : isWide ? "text-xl" : "text-xl",
                isWide ? "line-clamp-1" : "line-clamp-2"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {project.name}
            </h3>

            {isHero && project.topic && (
              <p className="mt-3 max-w-md text-sm text-[#d8cdb8] line-clamp-2">{project.topic}</p>
            )}

            {/* Funding — full details on hero/std, compact on wide */}
            <div className={cn("flex items-end justify-between gap-3", isHero ? "mt-6" : "mt-4")}>
              <div>
                {!isWide && <p className="text-[10px] text-[#d8cdb8]">{t("proj.card.raised")}</p>}
                <p className={cn("font-numeric leading-tight", isHero ? "text-lg" : "text-base")}>
                  {compactUsd(project.raisedAmount)}
                  <span className="text-[#a89c89]">
                    {" "}
                    {t("proj.card.of")} {compactUsd(project.investmentNeeded)}
                  </span>
                </p>
              </div>
              <p className="font-numeric text-sm text-[#c7a968]">
                {pct}% {t("proj.card.funded")}
              </p>
            </div>

            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#c7a968] transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>

            {!isWide && (
              <p className="mt-3 font-numeric text-[11px] text-[#d8cdb8]">
                {project.numberOfInvestors} {t("proj.card.investors")}
              </p>
            )}

            {/* CTA line — grows in on hover */}
            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-500 ease-out group-hover:mt-3 group-hover:grid-rows-[1fr] group-hover:opacity-100">
              <div className="overflow-hidden">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold text-[#c7a968]",
                    rtl ? "" : "uppercase tracking-[0.18em]"
                  )}
                >
                  {t("proj.card.view")}
                  <ArrowUpRight className={cn("size-3.5", rtl && "-scale-x-100")} />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </Tilt>
    </motion.article>
  );
}
