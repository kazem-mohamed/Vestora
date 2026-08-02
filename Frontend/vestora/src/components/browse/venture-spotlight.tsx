"use client";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Users } from "lucide-react";
import { BookmarkButton } from "@/components/projects/bookmark-button";
import { VentureImage } from "@/components/browse/venture-image";
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
import {
  SPOTLIGHT_REASON_KEY,
  commitmentPct,
  fundedPct,
  sectorOf,
} from "@/lib/browse/signals";
import { rememberVisited } from "@/lib/browse/use-browse-state";
import { navigateWithVentureMorph } from "@/lib/browse/view-transition";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ProjectCard } from "@/lib/types/api";
/**
 * The page's visual anchor — and a real venture rather than decoration, so the
 * strongest thing above the fold is also the most useful.
 *
 * Split composition (plate beside prose) instead of a full-bleed band: founder
 * artwork arrives in every aspect ratio, and a contained plate honours all of
 * them where a wide crop would decapitate a portrait shot. It also keeps the
 * headline on a solid surface, so legibility never depends on the picture.
 *
 * The choice is earned and stated — `reason` comes from real data, never index.
 */
export function VentureSpotlight({
  project,
  reason,
}: {
  project: ProjectCard;
  reason: "closing" | "watched" | "fresh";
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const plateRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pct = commitmentPct(project);
  const sector = sectorOf(project);
  return (
    <motion.section
      aria-labelledby="spotlight-name"
      variants={reduce ? staticVariants : stagger(0.08, 0.05)}
      initial="hidden"
      animate="show"
      className="relative"
    >
      {/* A soft bloom anchors the composition without adding a boxed container. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(50% 60% at 30% 40%, color-mix(in oklab, var(--primary) 11%, transparent), transparent 70%)",
        }}
      />
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        {/* Plate */}
        <motion.div
          ref={plateRef}
          variants={reduce ? reducedVariants : plateVariants}
          // Stacked (below lg) the plate spans the full column, so it stays wide
          // to leave the prose in view; side-by-side it can afford more height.
          className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-secondary ring-1 ring-border/80 sm:aspect-[2/1] lg:aspect-[16/11]"
        >
          <motion.div
            variants={reduce ? staticVariants : plateImageVariants}
            className="absolute inset-0"
          >
            <VentureImage
              imageId={project.coverImageId}
              name={project.name}
              sizes="(min-width:1024px) 46vw, 92vw"
              priority
              monogramSize="12rem"
              className={cn(
                "h-full w-full object-cover",
                // A slow, continuous drift on this one element only: enough to
                // feel alive, far too slow to distract while reading beside it.
                !reduce && "motion-safe:animate-[spotlight-drift_28s_ease-in-out_infinite_alternate]"
              )}
            />
          </motion.div>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.5rem] ring-1 ring-inset ring-white/[0.06]"
          />
          <div className="absolute end-4 top-4">
            <BookmarkButton projectId={project.id} className="size-11" />
          </div>
        </motion.div>
        {/* Prose */}
        <div className={cn("min-w-0", rtl ? "lg:pe-2" : "lg:ps-2")}>
          <motion.p
            variants={reduce ? reducedVariants : liftVariants}
            className={cn(
              "flex items-center gap-2.5 text-[11px] text-primary",
              rtl ? "" : "uppercase tracking-[0.28em]"
            )}
          >
            <span aria-hidden className="h-px w-8 bg-primary/60" />
            {t(SPOTLIGHT_REASON_KEY[reason])}
          </motion.p>
          <h2 id="spotlight-name" className="mt-4 overflow-hidden">
            <motion.span
              variants={reduce ? staticVariants : maskedLineVariants}
              className={cn(
                "block text-4xl font-bold leading-[1.08] sm:text-5xl",
                rtl ? "leading-[1.35]" : "tracking-[-0.02em]"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {project.name}
            </motion.span>
          </h2>
          {project.topic && (
            <motion.p
              variants={reduce ? reducedVariants : liftVariants}
              className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground"
            >
              {project.topic}
            </motion.p>
          )}
          <motion.p
            variants={reduce ? reducedVariants : liftVariants}
            className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground"
          >
            {project.stage && <span className="text-foreground">{project.stage}</span>}
            {project.stage && sector && <span aria-hidden>·</span>}
            {sector && <span>{sector}</span>}
            {sector && project.location && <span aria-hidden>·</span>}
            {project.location && <span>{project.location}</span>}
          </motion.p>
          <motion.div variants={reduce ? reducedVariants : liftVariants} className="mt-7 max-w-md">
            <CommitmentRail
              committed={project.committedAmount}
              funded={project.fundedAmount}
              target={project.investmentNeeded}
              pct={fundedPct(project)}
              committedPct={pct}
              complete={project.isFullyFunded}
              size="lg"
            />
          </motion.div>
          <motion.div
            variants={reduce ? reducedVariants : liftVariants}
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" strokeWidth={1.6} aria-hidden />
              <span className="font-numeric">{project.backerCount}</span>
              {t("browse.card.backers")}
            </span>
            {project.equityOffered != null && (
              <span className="font-numeric">
                {project.equityOffered}% {t("browse.card.equity")}
              </span>
            )}
            <Link
              href={`/u/${project.ownerId}`}
              data-cursor="hover"
              className="link-underline inline-flex min-h-11 items-center transition-colors hover:text-foreground"
            >
              {project.ownerName}
            </Link>
          </motion.div>
          <motion.div variants={reduce ? reducedVariants : liftVariants} className="mt-8">
            <Link
              href={`/projects/${project.id}`}
              onClick={(e) => {
                rememberVisited(project.id);
                if (
                  !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0 &&
                  navigateWithVentureMorph(plateRef.current, () =>
                    router.push(`/projects/${project.id}`)
                  )
                ) {
                  e.preventDefault();
                }
              }}
              data-cursor="hover"
              className="gold-cta group/cta inline-flex items-center gap-2.5 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground outline-none transition-transform duration-300 focus-visible:ring-3 focus-visible:ring-ring/40 motion-safe:hover:-translate-y-0.5"
            >
              {t("browse.spotlight.cta")}
              <ArrowUpRight
                className={cn(
                  "size-4 transition-transform duration-300 motion-safe:group-hover/cta:translate-x-0.5 motion-safe:group-hover/cta:-translate-y-0.5",
                  rtl && "-scale-x-100"
                )}
              />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
export const SPOTLIGHT_EASE = EASE;
