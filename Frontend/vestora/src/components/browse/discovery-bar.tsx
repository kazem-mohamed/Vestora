"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Search, SlidersHorizontal, X } from "lucide-react";
import { FacetMenu } from "@/components/browse/facet-menu";
import { EASE, EASE_OUT } from "@/lib/browse/motion";
import { categoryLabelKey } from "@/lib/config/categories";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { BrowseSort, CommitmentFilter, ProjectFacets } from "@/lib/types/api";
import type { BrowseState } from "@/lib/browse/use-browse-state";

const SORTS: { key: BrowseSort; labelKey: string }[] = [
  { key: "newest", labelKey: "browse.sort.newest" },
  { key: "close", labelKey: "browse.sort.close" },
  { key: "momentum", labelKey: "browse.sort.momentum" },
  { key: "largest", labelKey: "browse.sort.largest" },
  { key: "backers", labelKey: "browse.sort.backers" },
  { key: "discussed", labelKey: "browse.sort.discussed" },
];

const COMMITMENTS: { key: CommitmentFilter; labelKey: string }[] = [
  { key: "open", labelKey: "browse.commitment.open" },
  { key: "committed", labelKey: "browse.commitment.full" },
];

type ActiveFilter = { key: "stage" | "sector" | "location" | "commitment"; value: string };

/**
 * Everything that changes what you are looking at, in one place.
 *
 * Desktop keeps the controls inline and sticky — with only three dimensions over
 * a curated inventory, a drawer was a layer of ceremony for no gain. Mobile gets
 * a sheet, because inline menus at 375px would cover the results they filter.
 */
export function DiscoveryBar({
  state,
  facets,
  searchDraft,
  onSearch,
  onApply,
  onClear,
  activeFilters,
  savedOnly,
  onSavedOnly,
  canSave,
  resultCount,
  isFetching,
}: {
  state: BrowseState;
  facets?: ProjectFacets;
  searchDraft: string;
  onSearch: (v: string) => void;
  onApply: (next: Partial<BrowseState>) => void;
  onClear: () => void;
  activeFilters: ActiveFilter[];
  savedOnly: boolean;
  onSavedOnly: (v: boolean) => void;
  canSave: boolean;
  resultCount: number;
  isFetching: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheetOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  // The sector facet stores category keys; everything else stores what it shows.
  const sectorLabel = (v: string) => t(categoryLabelKey(v));

  const filterLabel = (f: ActiveFilter) =>
    f.key === "commitment"
      ? t(COMMITMENTS.find((c) => c.key === f.value)?.labelKey ?? "")
      : f.key === "sector"
        ? sectorLabel(f.value)
        : f.value;

  const controls = (
    <>
      <FacetMenu
        label={t("browse.facet.stage")}
        allLabel={t("browse.facet.allStages")}
        options={facets?.stages ?? []}
        selected={state.stage}
        onSelect={(v) => onApply({ stage: v })}
      />
      <FacetMenu
        label={t("browse.facet.sector")}
        allLabel={t("browse.facet.allSectors")}
        options={facets?.sectors ?? []}
        selected={state.sector}
        onSelect={(v) => onApply({ sector: v })}
        formatValue={sectorLabel}
      />
      <FacetMenu
        label={t("browse.facet.location")}
        allLabel={t("browse.facet.allLocations")}
        options={facets?.locations ?? []}
        selected={state.location}
        onSelect={(v) => onApply({ location: v })}
      />
      <FacetMenu
        label={t("browse.facet.commitment")}
        allLabel={t("browse.facet.allCommitment")}
        options={
          facets
            ? [
                { value: t("browse.commitment.open"), count: facets.open },
                { value: t("browse.commitment.full"), count: facets.fullyCommitted },
              ]
            : []
        }
        selected={
          state.commitment
            ? t(COMMITMENTS.find((c) => c.key === state.commitment)!.labelKey)
            : undefined
        }
        onSelect={(v) =>
          onApply({
            commitment: v === undefined ? undefined : v === t("browse.commitment.open") ? "open" : "committed",
          })
        }
      />
    </>
  );

  return (
    <div className="sticky top-16 z-30 -mx-6 border-b border-border/60 bg-background/85 px-6 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors",
                rtl ? "right-4" : "left-4"
              )}
            />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t("browse.search.placeholder")}
              aria-label={t("browse.search.label")}
              className={cn(
                "h-11 w-full rounded-full border border-input bg-card/60 text-sm outline-none backdrop-blur-sm",
                "transition-colors duration-300 placeholder:text-muted-foreground/70",
                "focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25",
                rtl ? "pe-11 ps-4" : "ps-11 pe-4"
              )}
            />
            {searchDraft && (
              <button
                type="button"
                onClick={() => onSearch("")}
                aria-label={t("browse.search.clear")}
                data-cursor="hover"
                className={cn(
                  "absolute top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
                  rtl ? "left-2" : "right-2"
                )}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Desktop facets */}
          <div className="hidden items-center gap-2 lg:flex">{controls}</div>

          {/* Mobile trigger */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            data-cursor="hover"
            aria-label={t("browse.filters.open")}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition-colors lg:hidden",
              activeFilters.length > 0
                ? "border-primary/55 bg-primary/[0.08] text-foreground"
                : "border-border/80 text-muted-foreground"
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("browse.filters.button")}</span>
            {activeFilters.length > 0 && (
              <span className="font-numeric grid size-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Saved-only — the shortlist reviewed in the same room it was built in. */}
          {canSave && (
            <button
              type="button"
              onClick={() => onSavedOnly(!savedOnly)}
              aria-pressed={savedOnly}
              data-cursor="hover"
              aria-label={t("browse.savedOnly")}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                savedOnly
                  ? "border-primary/55 bg-primary/[0.08] text-primary"
                  : "border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Bookmark className={cn("size-4", savedOnly && "fill-primary")} />
            </button>
          )}
        </div>

        {/* Sort + applied filters + count */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  data-cursor="hover"
                  onClick={() => onApply({ sort: s.key })}
                  aria-pressed={state.sort === s.key}
                  className={cn(
                    // min-h-11 keeps the touch target at 44px without inflating
                    // the pill's visual weight; the highlight tracks the text box.
                    "relative flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-xs outline-none transition-colors duration-300",
                    "focus-visible:ring-3 focus-visible:ring-ring/25",
                    state.sort === s.key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {state.sort === s.key && (
                    <motion.span
                      layoutId="sort-pill"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-x-0 inset-y-[7px] rounded-full bg-foreground/[0.07] ring-1 ring-border/70"
                    />
                  )}
                  <span className="relative">{t(s.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <p
            aria-live="polite"
            className={cn(
              "font-numeric shrink-0 text-xs text-muted-foreground transition-opacity duration-300",
              isFetching && "opacity-50"
            )}
          >
            {resultCount} {t(resultCount === 1 ? "browse.results.one" : "browse.results.other")}
          </p>
        </div>

        {/* Applied filters — removable without reopening anything. */}
        <AnimatePresence initial={false}>
          {(activeFilters.length > 0 || state.search) && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {state.search && (
                  <Chip label={`"${state.search}"`} onRemove={() => onSearch("")} />
                )}
                {activeFilters.map((f) => (
                  <Chip
                    key={f.key}
                    label={filterLabel(f)}
                    onRemove={() => onApply({ [f.key]: undefined } as Partial<BrowseState>)}
                  />
                ))}
                <button
                  type="button"
                  data-cursor="hover"
                  onClick={onClear}
                  className="link-underline text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("browse.filters.clear")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile sheet. The bar carries backdrop-blur, which makes it a containing
          block for position:fixed — so the sheet has to leave this subtree to
          reach the viewport. The portal stays mounted while closed so the exit
          animation has somewhere to play; it renders nothing on the server. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {sheetOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setSheetOpen(false)}
                  className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={t("browse.filters.button")}
                  initial={reduce ? { opacity: 0 } : { y: "100%" }}
                  animate={reduce ? { opacity: 1 } : { y: 0 }}
                  exit={reduce ? { opacity: 0 } : { y: "100%" }}
                  transition={{ duration: 0.42, ease: EASE }}
                  className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-background p-6 pb-8 shadow-2xl lg:hidden"
                >
                  <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" aria-hidden />
                  <div className="flex items-center justify-between">
                    <h2
                      className={cn("text-base font-bold", rtl ? "" : "uppercase tracking-[0.08em]")}
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {t("browse.filters.button")}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSheetOpen(false)}
                      aria-label={t("browse.filters.close")}
                      className="grid size-11 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">{controls}</div>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="gold-cta mt-7 w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground"
                  >
                    {t("browse.filters.show").replace("{n}", String(resultCount))}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
      data-cursor="hover"
      onClick={onRemove}
      className="group/chip flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/[0.07] px-3 py-1 text-xs text-foreground transition-colors hover:border-primary"
    >
      <span className="max-w-[12rem] truncate">{label}</span>
      <X className="size-3 text-muted-foreground transition-colors group-hover/chip:text-foreground" aria-hidden />
    </motion.button>
  );
}
