"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, Check, Search, X } from "lucide-react";
import { categoryOrRawLabel } from "@/lib/config/categories";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { CapitalFacets, CapitalSort, TicketBand } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const SORTS: CapitalSort[] = ["backed", "active", "ticket", "newest"];

/**
 * The register's filter rail.
 *
 * Kept as a single horizontal band of engraved controls rather than a sidebar of
 * checkbox groups: this page is read like a directory, and a sidebar would steal a
 * third of the width from the entries that matter. Counts come from the server with
 * every other filter applied, so no option here can lead to an empty page.
 */
export function CapitalRail({
  facets,
  search,
  onSearch,
  sector,
  band,
  trackRecord,
  sort,
  onApply,
  onClear,
  resultCount,
  isFetching,
  onSaveSearch,
  canSave,
}: {
  facets?: CapitalFacets;
  search: string;
  onSearch: (v: string) => void;
  sector?: string;
  band?: TicketBand;
  trackRecord: boolean;
  sort: CapitalSort;
  onApply: (next: {
    sector?: string;
    band?: TicketBand;
    trackRecord?: boolean;
    sort?: CapitalSort;
  }) => void;
  onClear: () => void;
  resultCount: number;
  isFetching: boolean;
  onSaveSearch: () => void;
  canSave: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  const hasFilters = Boolean(sector || band || trackRecord || search);

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
      className="space-y-4"
    >
      {/* ---- Search + count ---- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
              rtl ? "right-4" : "left-4"
            )}
            strokeWidth={1.8}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("cap.search.placeholder")}
            aria-label={t("cap.search.placeholder")}
            className={cn(
              "h-12 w-full rounded-full border border-input bg-card/60 text-sm outline-none backdrop-blur-sm",
              "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25",
              rtl ? "pe-11 ps-5" : "ps-11 pe-5"
            )}
          />
        </div>

        <div className="flex items-center gap-3">
          <p
            aria-live="polite"
            className={cn(
              "font-numeric text-xs text-muted-foreground transition-opacity duration-300",
              isFetching && "opacity-50"
            )}
          >
            {t("cap.results").replace("{n}", String(resultCount))}
          </p>

          {canSave && hasFilters && (
            <button
              type="button"
              data-cursor="hover"
              onClick={onSaveSearch}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs text-muted-foreground outline-none",
                "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
                "focus-visible:ring-3 focus-visible:ring-ring/25"
              )}
            >
              <Bookmark className="size-3.5" strokeWidth={1.8} />
              {t("cap.saveSearch")}
            </button>
          )}

          {/* The way back to what you already kept, offered where you keep things.
              Saving a search with no route to the list is how the count on the
              action band ends up pointing at nothing. */}
          {canSave && (
            <Link
              href="/searches"
              data-cursor="hover"
              className="link-underline text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("searches.manage")}
            </Link>
          )}
        </div>
      </div>

      {/* ---- Sectors ---- */}
      {(facets?.sectors.length ?? 0) > 0 && (
        <Group label={t("cap.filter.sector")}>
          {facets!.sectors.map((s) => (
            <Chip
              key={s.value}
              active={sector === s.value}
              count={s.count}
              onClick={() => onApply({ sector: sector === s.value ? undefined : s.value })}
            >
              {categoryOrRawLabel(s.value, t)}
            </Chip>
          ))}
        </Group>
      )}

      {/* ---- Cheque size ---- */}
      {(facets?.ticketBands.length ?? 0) > 0 && (
        <Group label={t("cap.filter.ticket")}>
          {facets!.ticketBands.map((b) => (
            <Chip
              key={b.value}
              active={band === b.value}
              count={b.count}
              onClick={() =>
                onApply({ band: band === b.value ? undefined : (b.value as TicketBand) })
              }
            >
              {t(`cap.band.${b.value}`)}
            </Chip>
          ))}
        </Group>
      )}

      {/* ---- Track record + ordering + reset ---- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border/50 pt-4">
        <button
          type="button"
          role="switch"
          aria-checked={trackRecord}
          data-cursor="hover"
          onClick={() => onApply({ trackRecord: !trackRecord })}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs outline-none transition-all duration-300",
            "focus-visible:ring-3 focus-visible:ring-ring/25",
            trackRecord
              ? "border-primary/60 bg-primary/[0.08] text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "grid size-3.5 place-items-center rounded-full transition-colors duration-300",
              trackRecord ? "bg-primary/20" : "bg-foreground/[0.07]"
            )}
          >
            <Check
              className={cn("size-2.5 transition-opacity", trackRecord ? "opacity-100" : "opacity-0")}
              strokeWidth={3}
            />
          </span>
          {t("cap.filter.trackRecord")}
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s}
              type="button"
              data-cursor="hover"
              aria-pressed={sort === s}
              onClick={() => onApply({ sort: s })}
              className={cn(
                "relative min-h-9 rounded-full px-3.5 text-xs outline-none transition-colors duration-300",
                "focus-visible:ring-3 focus-visible:ring-ring/25",
                sort === s ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {sort === s && (
                <motion.span
                  layoutId="capital-sort"
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-full border border-primary/40 bg-primary/[0.07]"
                />
              )}
              <span className="relative">{t(`cap.sort.${s}`)}</span>
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            type="button"
            data-cursor="hover"
            onClick={onClear}
            className="link-underline inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" strokeWidth={2.2} />
            {t("cap.clear")}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const { locale } = useLocale();
  const rtl = locale === "ar";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span
        className={cn(
          "shrink-0 text-[10px] text-muted-foreground",
          rtl ? "" : "uppercase tracking-[0.2em]"
        )}
      >
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-cursor="hover"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs outline-none transition-all duration-300",
        "focus-visible:ring-3 focus-visible:ring-ring/25",
        active
          ? "border-primary/60 bg-primary/[0.08] text-primary"
          : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
      <span className="font-numeric text-[10px] opacity-60">{count}</span>
    </button>
  );
}
