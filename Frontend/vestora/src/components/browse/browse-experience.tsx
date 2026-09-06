"use client";

import { useMemo } from "react";
import { ReactLenis } from "lenis/react";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { CustomCursor } from "@/components/motion/cursor";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";
import { BrowseMasthead } from "@/components/browse/browse-masthead";
import { DiscoveryBar } from "@/components/browse/discovery-bar";
import { VentureSpotlight } from "@/components/browse/venture-spotlight";
import { VentureCard } from "@/components/browse/venture-card";
import { ClosingRail, closingSoon } from "@/components/browse/closing-rail";
import { BrowseEmpty, BrowseError, BrowseSkeleton } from "@/components/browse/browse-states";
import { GuestInvite } from "@/components/browse/guest-invite";
import { EASE, stepDelay } from "@/lib/browse/motion";
import { pickSpotlight, viewThreshold } from "@/lib/browse/signals";
import {
  useBrowseScrollMemory,
  useBrowseState,
  useLastVisited,
} from "@/lib/browse/use-browse-state";
import { projectsApi } from "@/lib/api/projects";
import { useBookmarkIds } from "@/lib/hooks/use-bookmarks";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { ProjectCard } from "@/lib/types/api";

const PAGE_SIZE = 9;

export function BrowseExperience() {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const user = useAuthStore((s) => s.user);

  const { state, searchDraft, setSearchDraft, apply, clearAll, revealMore, activeFilters, hasQuery } =
    useBrowseState();

  const { data: savedIds } = useBookmarkIds();
  const lastVisited = useLastVisited();

  // Lives in the URL like every other browse filter, so /projects?saved=1 is a
  // real destination — it is where /saved now sends people. Signing out simply
  // makes the view inapplicable rather than needing to be reset.
  const savedOnly = state.savedOnly && Boolean(user);
  const setSavedOnly = (v: boolean) => apply({ savedOnly: v });

  const queryParams = useMemo(
    () => ({
      search: state.search || undefined,
      sector: state.sector,
      location: state.location,
      stage: state.stage,
      commitment: state.commitment,
      sort: state.sort,
    }),
    [state]
  );

  // Each revealed page is its own cached query, so "show more" appends without
  // refetching what is already on screen, and going back re-reads from cache.
  const pageQueries = useQueries({
    queries: Array.from({ length: state.pages }, (_, i) => ({
      queryKey: ["browse", queryParams, i + 1] as const,
      queryFn: () => projectsApi.list({ ...queryParams, page: i + 1, pageSize: PAGE_SIZE }),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    })),
  });

  // The rail describes the whole filtered inventory, not the pages revealed so
  // far — a round at 88% is worth surfacing whether or not the visitor has
  // scrolled far enough to load it. "close" is the sort the API already owns.
  const closingQuery = useQuery({
    queryKey: ["browse-closing", queryParams.search, state.sector, state.location, state.stage],
    queryFn: () =>
      projectsApi.list({
        search: state.search || undefined,
        sector: state.sector,
        location: state.location,
        stage: state.stage,
        sort: "close",
        page: 1,
        pageSize: 12,
      }),
    staleTime: 60_000,
  });

  const facetsQuery = useQuery({
    queryKey: ["browse-facets", queryParams.search, state.sector, state.location, state.stage, state.commitment],
    queryFn: () =>
      projectsApi.facets({
        search: state.search || undefined,
        sector: state.sector,
        location: state.location,
        stage: state.stage,
        commitment: state.commitment,
      }),
    staleTime: 60_000,
  });

  const first = pageQueries[0];
  const isLoading = first?.isLoading ?? true;
  const isError = pageQueries.some((q) => q.isError);
  const isFetching = pageQueries.some((q) => q.isFetching);

  const allItems = useMemo(() => {
    const seen = new Set<number>();
    const out: ProjectCard[] = [];
    for (const q of pageQueries) {
      for (const item of q.data?.items ?? []) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          out.push(item);
        }
      }
    }
    return out;
  }, [pageQueries]);

  const total = first?.data?.totalCount ?? 0;
  const hasMore = allItems.length < total;

  // The shortlist is reviewed in the same room it was built in — a client-side
  // narrowing of the current result set, not a separate destination.
  const items = useMemo(
    () => (savedOnly ? allItems.filter((p) => (savedIds ?? []).includes(p.id)) : allItems),
    [allItems, savedOnly, savedIds]
  );

  const threshold = useMemo(() => viewThreshold(allItems), [allItems]);

  // The spotlight is an entry-point device. Once someone searches, filters, sorts
  // or digs past the first page they have stated their own criteria, and an
  // editorial pick on top of that is noise rather than help.
  const spotlight = useMemo(
    () =>
      hasQuery || savedOnly || state.pages > 1 || state.sort !== "newest"
        ? null
        : pickSpotlight(allItems),
    [allItems, hasQuery, savedOnly, state.pages, state.sort]
  );

  const gridItems = useMemo(
    () => (spotlight ? items.filter((p) => p.id !== spotlight.venture.id) : items),
    [items, spotlight]
  );

  const scrollKey = useMemo(() => JSON.stringify({ ...queryParams, pages: state.pages }), [queryParams, state.pages]);
  useBrowseScrollMemory(scrollKey, !isLoading && allItems.length > 0);

  // Recovery routes for a dead end must come from the WHOLE inventory — the
  // scoped facets are empty by definition when the current query found nothing.
  const allSectorsQuery = useQuery({
    queryKey: ["browse-facets", "unscoped"],
    queryFn: () => projectsApi.facets(),
    staleTime: 5 * 60_000,
  });

  const suggestions = useMemo(
    () => (allSectorsQuery.data?.sectors ?? []).slice(0, 5),
    [allSectorsQuery.data]
  );

  const closing = useMemo(
    () => closingSoon(closingQuery.data?.items ?? []),
    [closingQuery.data]
  );

  return (
    <ReactLenis root options={{ lerp: reduce ? 1 : 0.09 }}>
      {/* The decorative blooms bleed past the container by design; clip them here
          so they can never introduce a horizontal scrollbar. */}
      <div className="cursor-showpiece relative min-h-svh overflow-x-clip bg-background text-foreground">
        <CustomCursor />
        <SiteHeader />

        <main className="mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pt-20">
          <BrowseMasthead facets={facetsQuery.data} />

          <div className="mt-10">
            <DiscoveryBar
              state={state}
              facets={facetsQuery.data}
              searchDraft={searchDraft}
              onSearch={setSearchDraft}
              onApply={apply}
              onClear={() => {
                clearAll();
              }}
              activeFilters={activeFilters}
              savedOnly={savedOnly}
              onSavedOnly={setSavedOnly}
              canSave={Boolean(user)}
              resultCount={savedOnly ? items.length : total}
              isFetching={isFetching}
            />
          </div>

          {isError ? (
            <div className="mt-14">
              <BrowseError onRetry={() => pageQueries.forEach((q) => q.refetch())} />
            </div>
          ) : isLoading ? (
            <div className="mt-14">
              <BrowseSkeleton />
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait" initial={false}>
                {spotlight && (
                  <motion.div
                    key={spotlight.venture.id}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="mt-14 sm:mt-16"
                  >
                    <VentureSpotlight project={spotlight.venture} reason={spotlight.reason} />
                    <div className="mt-16 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Between the single spotlight and the uniform grid, a third
                  density: the rounds about to close, ordered by how close they
                  are. Only appears when the inventory actually has them. */}
              {!savedOnly && <ClosingRail items={closing} />}

              {gridItems.length === 0 ? (
                <div className="mt-14">
                  <BrowseEmpty
                    suggestions={suggestions}
                    onPick={(sector) => {
                      apply({ search: "", sector, savedOnly: false });
                      setSearchDraft("");
                    }}
                    onClear={() => {
                      clearAll();
                    }}
                  />
                </div>
              ) : (
                <>
                  <LayoutGroup id="browse-grid">
                    <motion.div
                      layout={!reduce}
                      className={cn(
                        "mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3",
                        isFetching && "opacity-70 transition-opacity duration-300"
                      )}
                      aria-busy={isFetching}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {gridItems.map((project, i) => (
                          <motion.div
                            key={project.id}
                            layout={!reduce}
                            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.6, delay: stepDelay(i % 3), ease: EASE },
                            }}
                            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                            transition={
                              reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }
                            }
                          >
                            <VentureCard
                              project={project}
                              index={i}
                              viewThreshold={threshold}
                              wasVisited={lastVisited === project.id}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </LayoutGroup>

                  {!savedOnly && hasMore && (
                    <div className="mt-14 flex flex-col items-center gap-4">
                      <p className="font-numeric text-xs text-muted-foreground">
                        {t("browse.showing")
                          .replace("{shown}", String(allItems.length))
                          .replace("{total}", String(total))}
                      </p>
                      <button
                        type="button"
                        data-cursor="hover"
                        onClick={revealMore}
                        disabled={isFetching}
                        className={cn(
                          "rounded-full border border-border px-8 py-3 text-sm text-foreground outline-none",
                          "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
                          "focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50"
                        )}
                      >
                        {isFetching ? t("browse.loading") : t("browse.more")}
                      </button>
                    </div>
                  )}

                  {!savedOnly && !hasMore && allItems.length > PAGE_SIZE && (
                    <p className="mt-14 text-center font-numeric text-xs text-muted-foreground/70">
                      {t("browse.allShown").replace("{n}", String(total))}
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {!user && !isLoading && !isError && <GuestInvite />}
        </main>

        <Footer variant="compact" />
      </div>
    </ReactLenis>
  );
}
