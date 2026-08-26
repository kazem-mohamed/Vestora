"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Eye, Users } from "lucide-react";
import { BookmarkButton } from "@/components/projects/bookmark-button";
import { VentureImage } from "@/components/browse/venture-image";
import { SignalMark } from "@/components/browse/signal-mark";
import { CommitmentRail } from "@/components/browse/commitment-rail";
import {
  EASE,
  liftVariants,
  maskedLineVariants,
  plateImageVariants,
  plateVariants,
  reducedVariants,
  stagger,
  staticVariants,
} from "@/lib/browse/motion";
import { commitmentPct, fundedPct, primarySignal, sectorOf } from "@/lib/browse/signals";
import { rememberVisited } from "@/lib/browse/use-browse-state";
import { navigateWithVentureMorph } from "@/lib/browse/view-transition";
import { categoryLabelKey } from "@/lib/config/categories";
import { compactUsd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ProjectCard } from "@/lib/types/api";

/**
 * The browse surface for a single venture.
 *
 * Two zones, never overlapping: an image PLATE that carries the venture's
 * identity, and an information block on the card's own surface underneath.
 * Keeping text off the photograph is what makes every card legible regardless of
 * how bright or busy its picture is — and it is why this card needs no scrim.
 */
export function VentureCard({
  project,
  index,
  viewThreshold,
  wasVisited,
}: {
  project: ProjectCard;
  index: number;
  viewThreshold: number;
  wasVisited?: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const pct = commitmentPct(project);
  const signal = primarySignal(project, viewThreshold);
  const sector = sectorOf(project);

  return (
    <motion.article
      ref={ref}
      layout
      layoutId={`venture-${project.id}`}
      variants={reduce ? staticVariants : stagger(0.06)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="group/card relative h-full"
    >
      <Link
        href={`/projects/${project.id}`}
        onClick={(e) => {
          rememberVisited(project.id);
          // Let the plate travel to the detail hero instead of being replaced.
          if (
            !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0 &&
            navigateWithVentureMorph(plateRef.current, () =>
              router.push(`/projects/${project.id}`)
            )
          ) {
            e.preventDefault();
          }
        }}
        data-cursor-text={t("browse.card.cursor")}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border bg-card/70 outline-none",
          "transition-[border-color,box-shadow,transform] duration-500 ease-out",
          "hover:border-primary/45 hover:shadow-[0_28px_60px_-32px_rgba(0,0,0,0.65)]",
          "focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25",
          "motion-safe:hover:-translate-y-1",
          wasVisited ? "border-primary/45" : "border-border/70"
        )}
      >
        {/* --- Plate: identity. No text sits on the photograph. --- */}
        <motion.div
          ref={plateRef}
          variants={reduce ? reducedVariants : plateVariants}
          className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-secondary"
        >
          <motion.div variants={reduce ? staticVariants : plateImageVariants} className="absolute inset-0">
            <VentureImage
              imageId={project.coverImageId}
              name={project.name}
              sizes="(min-width:1280px) 30vw, (min-width:768px) 45vw, 92vw"
              priority={index < 3}
              className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out motion-safe:group-hover/card:scale-[1.06]"
            />
          </motion.div>

          {/* Hairline frame, brightening on hover — depth without tilting the card. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-1 ring-inset ring-white/[0.07] transition-colors duration-500 group-hover/card:ring-primary/25"
          />

          {/* Only the plate's very bottom is darkened, and only where the chip sits. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent"
          />

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5">
            {project.stage && (
              <span className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-[#f0eae0] backdrop-blur-sm">
                {project.stage}
              </span>
            )}
            {signal && <SignalMark signal={signal} />}
          </div>
        </motion.div>

        {/* --- Information: always on the card surface, always legible. --- */}
        <motion.div
          variants={reduce ? reducedVariants : liftVariants}
          className="flex flex-1 flex-col gap-3 p-5"
        >
          <div>
            {/* A real heading so assistive tech can jump venture to venture. */}
            <h3 className="overflow-hidden">
              <motion.span
                variants={reduce ? staticVariants : maskedLineVariants}
                // Clamped to two lines so one unusually long name cannot set the
                // height of every card in its row.
                className={cn(
                  "block line-clamp-2 text-lg font-bold leading-tight transition-colors duration-300 group-hover/card:text-primary",
                  rtl ? "" : "tracking-[-0.01em]"
                )}
                style={{ fontFamily: "var(--font-heading)" }}
                title={project.name}
              >
                {project.name}
              </motion.span>
            </h3>
            {project.topic && (
              <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
                {project.topic}
              </p>
            )}
          </div>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground/85">
            {sector && <span className="truncate">{t(categoryLabelKey(sector))}</span>}
            {sector && project.location && <span aria-hidden>·</span>}
            {project.location && <span className="truncate">{project.location}</span>}
          </p>

          {/* The figures below are split across elements for layout; a screen
              reader gets them as one sentence in the summary at the end instead. */}
          <div className="mt-auto pt-1" aria-hidden>
            <CommitmentRail
              committed={project.committedAmount}
              funded={project.fundedAmount}
              target={project.investmentNeeded}
              pct={fundedPct(project)}
              committedPct={pct}
              complete={project.isFullyFunded}
            />
          </div>

          <div
            aria-hidden
            className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground"
          >
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" strokeWidth={1.6} aria-hidden />
                <span className="font-numeric">{project.backerCount}</span>
              </span>
              {project.viewCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5" strokeWidth={1.6} aria-hidden />
                  <span className="font-numeric">{project.viewCount}</span>
                </span>
              )}
            </span>

            {/* Deal terms surface on intent rather than competing for attention. */}
            <span className="relative flex items-center">
              <span className="font-numeric transition-opacity duration-300 group-hover/card:opacity-0">
                {project.equityOffered != null
                  ? `${project.equityOffered}% ${t("browse.card.equity")}`
                  : compactUsd(project.investmentNeeded)}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 flex items-center gap-1 whitespace-nowrap font-semibold text-primary opacity-0 transition-all duration-300 group-hover/card:opacity-100",
                  rtl ? "left-0 -translate-x-1 group-hover/card:translate-x-0" : "right-0 translate-x-1 group-hover/card:translate-x-0"
                )}
              >
                {t("browse.card.open")}
                <ArrowUpRight className={cn("size-3.5", rtl && "-scale-x-100")} />
              </span>
            </span>
          </div>

          {/* The deal figures as one spoken sentence, replacing the fragments above. */}
          <span className="sr-only">
            {[
              t("browse.a11y.committed")
                .replace("{committed}", compactUsd(project.committedAmount))
                .replace("{target}", compactUsd(project.investmentNeeded))
                .replace("{pct}", String(pct)),
              project.isFullyCommitted ? t("browse.rail.fullyCommitted") : t("browse.rail.committed"),
              t("browse.a11y.backers").replace("{n}", String(project.backerCount)),
              project.equityOffered != null
                ? `${project.equityOffered}% ${t("browse.card.equity")}`
                : null,
            ]
              .filter(Boolean)
              .join(". ")}
          </span>
        </motion.div>
      </Link>

      {/* Save sits outside the link so it is its own control, not part of the
          venture's accessible name. */}
      <div className="absolute end-3 top-3 z-10">
        <BookmarkButton projectId={project.id} className="size-11 sm:size-10" />
      </div>
    </motion.article>
  );
}

export const CARD_EASE = EASE;
