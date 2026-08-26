"use client";

import { use, useEffect, useRef } from "react";
import Link from "next/link";
import { ReactLenis } from "lenis/react";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CustomCursor } from "@/components/motion/cursor";
import { Reveal } from "@/components/motion/reveal";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { NextVentures } from "@/components/projects/next-ventures";
import { OwnerPreviewBanner } from "@/components/projects/owner-preview-banner";
import { BookmarkButton } from "@/components/projects/bookmark-button";
import { ProjectComments } from "@/components/projects/project-comments";
import { ProjectGallery } from "@/components/projects/project-gallery";
import { DocumentsSection } from "@/components/projects/documents-section";
import { MilestonesJourney } from "@/components/projects/milestones-journey";
import { ShareButton } from "@/components/projects/share-button";
import { TeamSection } from "@/components/projects/team-section";
import { TrustSignals } from "@/components/signals/trust-signals";
import { SupportPanel } from "@/components/projects/support-panel";
import { UpdatesSection } from "@/components/projects/updates-section";
import { VideoModal } from "@/components/projects/video-modal";
import { ProjectReviews } from "@/components/projects/project-reviews";
import { ReportButton } from "@/components/projects/report-button";
import { useAuthStore } from "@/lib/auth/store";
import { projectImageUrl, projectsApi } from "@/lib/api/projects";
import { engagementApi } from "@/lib/api/engagement";
import { tagVentureMorphTarget } from "@/lib/browse/view-transition";
import { ApiError } from "@/lib/api/client";
import { categoryLabelKey } from "@/lib/config/categories";
import { useLocale } from "@/lib/i18n/locale";
import type { Project } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Full-bleed parallax hero. Lives in its own component so the useScroll
 * target ref exists from its very first render — measuring it from the page
 * (which first renders a skeleton without the hero) breaks the progress
 * value and leaves the content faded out.
 */
function DetailHero({
  project,
  pct,
  funded,
}: {
  project: Project;
  pct: number;
  funded: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const BackArrow = rtl ? ArrowRight : ArrowLeft;

  const heroRef = useRef<HTMLElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);

  // Claim the shared name for one paint so the plate arriving from Browse lands
  // on this hero, then release it so it never blocks a later transition.
  useEffect(() => {
    tagVentureMorphTarget(morphRef.current);
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  const cover = project.imageIds[0];
  const metaLine = [project.category && t(categoryLabelKey(project.category)), project.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <section ref={heroRef} className="relative h-[86svh] min-h-[560px] overflow-hidden">
      <motion.div style={{ y: imgY }} className="absolute inset-0 scale-[1.08]">
        {cover != null ? (
          // Morph target for the venture's plate on Browse, so the picture
          // travels between the two pages instead of being replaced.
          <div ref={morphRef} className="h-full w-full">
            <img src={projectImageUrl(cover)} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <>
            {/* Brand-gradient base — the ultimate fallback */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(120% 120% at 15% 0%, color-mix(in oklab, var(--primary) 26%, #141210), #141210 70%), radial-gradient(100% 100% at 100% 100%, color-mix(in oklab, var(--bronze) 30%, transparent), transparent 60%)",
              }}
            />
            {/* Curated fallback hero (public/hero/hero-{1..3}.jpg); hides itself
                if the file is missing, revealing the gradient. */}
            <img
              src={`/hero/hero-${(project.id % 3) + 1}.jpg`}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </>
        )}
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/35 to-[#0a0908]/15" />

      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        className="absolute start-6 top-6 z-10 sm:start-10"
      >
        <Link
          href="/projects"
          data-cursor="hover"
          className={`link-underline inline-flex items-center gap-2 text-xs text-[#d8cdb8] transition-colors hover:text-[#f0eae0] ${
            rtl ? "" : "uppercase tracking-[0.2em]"
          }`}
        >
          <BackArrow className="size-3.5" />
          {t("proj.detail.back")}
        </Link>
      </motion.div>

      {/* Save + share */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
        className="absolute end-6 top-6 z-30 flex items-center gap-2 sm:end-10"
      >
        <BookmarkButton projectId={project.id} />
        <ShareButton title={project.name} path={`/projects/${project.id}`} />
      </motion.div>

      {/* Hero content */}
      <motion.div
        style={{ opacity: contentOpacity }}
        className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-6xl px-6 pb-14 text-[#f0eae0] sm:px-10"
      >
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
          className={`text-xs ${funded ? "text-[#c7a968]" : "text-[#d8cdb8]"} ${
            rtl ? "" : "uppercase tracking-[0.35em]"
          }`}
        >
          {funded ? t("proj.card.completed") : t("proj.card.needs")}
        </motion.p>

        <span className="block overflow-hidden pb-1">
          <motion.h1
            initial={{ y: "112%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1.05, delay: 0.35, ease: EASE }}
            className={`max-w-4xl text-4xl font-bold leading-[1.08] sm:text-6xl ${
              rtl ? "" : "tracking-[-0.01em]"
            }`}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {project.name}
          </motion.h1>
        </span>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
          className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#d8cdb8]"
        >
          {metaLine && <span>{metaLine}</span>}
          <span>
            {t("proj.detail.by")}{" "}
            <Link
              href={`/u/${project.ownerId}`}
              data-cursor="hover"
              className="text-[#f0eae0] underline-offset-4 transition-colors hover:text-[#c7a968] hover:underline"
            >
              {project.ownerName}
            </Link>
          </span>
          {project.videoUrl && <VideoModal videoUrl={project.videoUrl} />}
        </motion.div>
      </motion.div>
    </section>
  );
}

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = Number(id);
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const BackArrow = rtl ? ArrowRight : ArrowLeft;
  const currentUser = useAuthStore((s) => s.user);

  // Wait for the session to settle before asking. This endpoint answers
  // differently for the owner — a listing awaiting review is a 404 to everyone
  // else — so firing while the refresh token is still being exchanged would ask
  // anonymously, get a 404, and the retry rule below (correctly) never retries a
  // 404, leaving a founder permanently locked out of their own listing.
  const authStatus = useAuthStore((s) => s.status);
  const authSettled = authStatus === "authenticated" || authStatus === "unauthenticated";

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", projectId, authStatus === "authenticated"],
    queryFn: () => projectsApi.details(projectId),
    enabled: Number.isFinite(projectId) && authSettled,
    retry: (count, err) =>
      !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  // F10: log a view once per mount (guest-friendly, de-duped server-side).
  useEffect(() => {
    if (Number.isFinite(projectId)) engagementApi.trackView(projectId);
  }, [projectId]);

  const notFound =
    !Number.isFinite(projectId) || (error instanceof ApiError && error.status === 404);

  // Progress means settled money, not approvals collected. The hero used to call a
  // venture "Completed" the moment enough people said yes to it.
  const pct =
    project && project.investmentNeeded > 0
      ? Math.min(100, Math.round((project.fundedAmount / project.investmentNeeded) * 100))
      : 0;
  const funded = project ? project.status === "Funded" || pct >= 100 : false;

  // Public, like Browse: a venture page is the thing that convinces someone to
  // join. The details endpoint is already anonymous, and every action on this
  // page (support, save, comment, message) gates itself.
  return (
    <ReactLenis root>
      <div className="cursor-showpiece relative min-h-svh bg-background text-foreground">
        <CustomCursor />
        <SiteHeader />

        {notFound ? (
          <section className="mx-auto max-w-2xl px-6 py-32 text-center">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {t("proj.detail.notFound.title")}
            </h1>
            <p className="mt-3 text-muted-foreground">{t("proj.detail.notFound.body")}</p>
            <Link
              href="/projects"
              data-cursor="hover"
              className="gold-cta mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              <BackArrow className="size-4" />
              {t("proj.detail.back")}
            </Link>
          </section>
        ) : isLoading || !project ? (
          <div className="animate-pulse">
            <div className="skeleton-shimmer h-[68svh]" />
            <div className="mx-auto max-w-4xl space-y-4 px-6 py-14">
              <div className="h-4 w-40 rounded bg-foreground/10" />
              <div className="h-4 w-full rounded bg-foreground/10" />
              <div className="h-4 w-2/3 rounded bg-foreground/10" />
            </div>
          </div>
        ) : (
          <>
            <DetailHero project={project} pct={pct} funded={funded} />

            {currentUser?.id === project.ownerId && (
              <div className="px-6 sm:px-10">
                <OwnerPreviewBanner project={project} />
              </div>
            )}

            <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10 sm:py-20">
              <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
                {/* Sticky funding + support — on top on mobile, on the side on desktop */}
                <aside className="lg:order-2 lg:sticky lg:top-24 lg:self-start">
                  <SupportPanel project={project} pct={pct} funded={funded} />
                </aside>

                {/* Main column.
                    The rhythm is deliberately uneven. Substance — the pitch and
                    the roadmap — is given the most air; evidence sits closer
                    together; the archival material at the bottom is tighter
                    still. Nine sections at one identical interval read as a
                    document, and a reader stops distinguishing between them. */}
                <div className="min-w-0 lg:order-1">
                  {/* About — the widest breath on the page. */}
                  <section className="grid gap-8 sm:grid-cols-[1fr_2fr]">
                    <Reveal>
                      <h2 className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.35em]"}`}>
                        {t("proj.detail.about")}
                      </h2>
                      {project.topic && (
                        <p className="mt-4 text-sm text-muted-foreground">{project.topic}</p>
                      )}
                    </Reveal>
                    <Reveal delay={0.1}>
                      <p className="whitespace-pre-line text-lg leading-relaxed text-foreground/90">
                        {project.description}
                      </p>
                      {project.useOfFunds && (
                        <div className="mt-8">
                          <p className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.2em]"}`}>
                            {t("proj.useOfFunds.title")}
                          </p>
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                            {project.useOfFunds}
                          </p>
                        </div>
                      )}
                    </Reveal>
                  </section>

                  {/* Roadmap — substance, full weight. */}
                  <div className="mt-20 sm:mt-28">
                    <MilestonesJourney
                      projectId={project.id}
                      isOwner={currentUser?.id === project.ownerId}
                    />
                  </div>

                  {/* Evidence: team, updates, documents — a closer, steadier beat. */}
                  <div className="mt-20 space-y-14 sm:mt-28 sm:space-y-16">
                    {/* What the platform can actually prove about this listing, stated
                        before the evidence the founder assembled themselves — so a
                        reader knows which of the two they are looking at. */}
                    <Reveal>
                      <TrustSignals signals={project.trustSignals} subject="venture" />
                    </Reveal>

                    <TeamSection
                      projectId={project.id}
                      isOwner={currentUser?.id === project.ownerId}
                    />

                    <UpdatesSection
                      projectId={project.id}
                      isOwner={currentUser?.id === project.ownerId}
                    />

                    <DocumentsSection
                      projectId={project.id}
                      isOwner={currentUser?.id === project.ownerId}
                    />

                    {project.imageIds.length > 0 && (
                      <section>
                        <Reveal>
                          <ProjectGallery imageIds={project.imageIds} name={project.name} />
                        </Reveal>
                      </section>
                    )}
                  </div>

                  {/* Community record — tightest beat, and ruled off from the
                      venture's own case for itself. */}
                  <div className="mt-20 space-y-12 sm:mt-24">
                    <section className="border-t border-border pt-14 sm:pt-16">
                      <ProjectReviews projectId={project.id} />
                    </section>

                    <section className="border-t border-border pt-14 sm:pt-16">
                      <ProjectComments projectId={project.id} comments={project.comments} />
                    </section>

                    <div className="flex justify-end border-t border-border/60 pt-8">
                      <ReportButton projectId={project.id} ownerId={project.ownerId} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Where to go next — full width, outside the two-column grid, so it
                  reads as leaving this venture rather than as part of it. */}
              <div className="mt-16 sm:mt-20">
                <NextVentures
                  projectId={project.id}
                  ownerId={project.ownerId}
                  ownerName={project.ownerName}
                />
              </div>
            </div>

            <Footer variant="compact" />
          </>
        )}
      </div>
    </ReactLenis>
  );
}
