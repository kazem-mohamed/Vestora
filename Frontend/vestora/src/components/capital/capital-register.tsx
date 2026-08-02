"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Compass, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CapitalMasthead } from "@/components/capital/capital-masthead";
import { CapitalRail } from "@/components/capital/capital-rail";
import { InvestorPlate } from "@/components/capital/investor-plate";
import { ApproachDialog } from "@/components/capital/approach-dialog";
import { capitalApi } from "@/lib/api/capital";
import { signalsApi } from "@/lib/api/deals";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { CapitalSort, InvestorCard, TicketBand } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;
const PAGE_SIZE = 9;
const SORTS: CapitalSort[] = ["backed", "active", "ticket", "newest"];
const BANDS: TicketBand[] = ["under50", "50to250", "250to1m", "over1m"];

/**
 * The capital register.
 *
 * State lives in the URL exactly as it does on browse, so a filtered view of the
 * directory is shareable and survives a refresh — and so the founder who opens an
 * investor's profile and comes back lands where they left rather than at the top of
 * an unfiltered list.
 */
export function CapitalRegister() {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const search = sp.get("q") ?? "";
  const sector = sp.get("sector") ?? undefined;
  const bandParam = sp.get("band");
  const band = BANDS.includes(bandParam as TicketBand) ? (bandParam as TicketBand) : undefined;
  const trackRecord = sp.get("proven") === "1";
  const sortParam = sp.get("sort");
  const sort = SORTS.includes(sortParam as CapitalSort) ? (sortParam as CapitalSort) : "backed";
  const pages = Math.max(1, Number(sp.get("pages") ?? 1) || 1);

  const [draft, setDraft] = useState(search);
  const [approaching, setApproaching] = useState<InvestorCard | null>(null);

  const write = useCallback(
    (next: Record<string, string | undefined>, resetPages = true) => {
      const q = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === undefined || v === "") q.delete(k);
        else q.set(k, v);
      }
      if (resetPages) q.delete("pages");
      const s = q.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [pathname, router, sp]
  );

  // Debounced commit of the search box into the URL, so typing stays instant.
  const onSearch = useCallback(
    (v: string) => {
      setDraft(v);
      const id = setTimeout(() => write({ q: v || undefined }), 320);
      return () => clearTimeout(id);
    },
    [write]
  );

  const params = useMemo(
    () => ({ search: search || undefined, sector, band, trackRecord: trackRecord || undefined, sort }),
    [search, sector, band, trackRecord, sort]
  );

  // Each revealed page is its own cached query, so "show more" appends instead of
  // refetching what is already on screen.
  const pageQueries = useQueries({
    queries: Array.from({ length: pages }, (_, i) => ({
      queryKey: ["capital", params, i + 1] as const,
      queryFn: () => capitalApi.list({ ...params, page: i + 1, pageSize: PAGE_SIZE }),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    })),
  });

  const facets = useQuery({
    queryKey: ["capital-facets", params.search, sector, band, trackRecord],
    queryFn: () => capitalApi.facets({ search: search || undefined, sector, band, trackRecord: trackRecord || undefined }),
    staleTime: 60_000,
  });

  const first = pageQueries[0];
  const isLoading = first?.isLoading ?? true;
  const isError = pageQueries.some((q) => q.isError);
  const isFetching = pageQueries.some((q) => q.isFetching);

  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: InvestorCard[] = [];
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
  const hasMore = items.length < total;

  async function saveSearch() {
    try {
      await signalsApi.saveSearch({
        name: sector ?? search ?? t("cap.saveSearch.default"),
        scope: "investors",
        search: search || undefined,
        sector,
      });
      toast.success(t("cap.saveSearch.done"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <>
      <CapitalMasthead facets={facets.data} />

      <div className="mt-12">
        <CapitalRail
          facets={facets.data}
          search={draft}
          onSearch={onSearch}
          sector={sector}
          band={band}
          trackRecord={trackRecord}
          sort={sort}
          onApply={(next) =>
            write({
              sector: "sector" in next ? next.sector : sector,
              band: "band" in next ? next.band : band,
              proven: ("trackRecord" in next ? next.trackRecord : trackRecord) ? "1" : undefined,
              sort: "sort" in next ? next.sort : sort,
            })
          }
          onClear={() => {
            setDraft("");
            router.replace(pathname, { scroll: false });
          }}
          resultCount={total}
          isFetching={isFetching}
          onSaveSearch={saveSearch}
          canSave
        />
      </div>

      {/* ---- Entries ---- */}
      {isError ? (
        <State
          icon={RotateCcw}
          title={t("cap.error.title")}
          body={t("cap.error.body")}
          action={
            <button
              type="button"
              data-cursor="hover"
              onClick={() => pageQueries.forEach((q) => q.refetch())}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-6 text-sm transition-colors hover:border-primary/50 hover:text-primary"
            >
              {t("cap.error.retry")}
            </button>
          }
        />
      ) : isLoading ? (
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-shimmer h-[22rem] rounded-[1.4rem] border border-border/50"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <State
          icon={Compass}
          title={t("cap.empty.title")}
          body={t("cap.empty.body")}
          action={
            <button
              type="button"
              data-cursor="hover"
              onClick={() => {
                setDraft("");
                router.replace(pathname, { scroll: false });
              }}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-6 text-sm transition-colors hover:border-primary/50 hover:text-primary"
            >
              {t("cap.clear")}
            </button>
          }
        />
      ) : (
        <>
          <LayoutGroup id="capital-grid">
            <motion.div
              layout={!reduce}
              className={cn(
                "mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3",
                isFetching && "opacity-70 transition-opacity duration-300"
              )}
              aria-busy={isFetching}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((inv, i) => (
                  <motion.div
                    key={inv.id}
                    layout={!reduce}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }
                    }
                  >
                    <InvestorPlate investor={inv} index={i} onApproach={setApproaching} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>

          {hasMore && (
            <div className="mt-14 flex flex-col items-center gap-4">
              <p className="font-numeric text-xs text-muted-foreground">
                {t("cap.showing")
                  .replace("{shown}", String(items.length))
                  .replace("{total}", String(total))}
              </p>
              <button
                type="button"
                data-cursor="hover"
                disabled={isFetching}
                onClick={() => write({ pages: String(pages + 1) }, false)}
                className={cn(
                  "rounded-full border border-border px-8 py-3 text-sm outline-none",
                  "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
                  "focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50"
                )}
              >
                {isFetching ? t("browse.loading") : t("cap.more")}
              </button>
            </div>
          )}
        </>
      )}

      <ApproachDialog
        investor={approaching}
        open={approaching !== null}
        onOpenChange={(v) => !v && setApproaching(null)}
      />
    </>
  );
}

function State({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="mt-16 flex flex-col items-center rounded-[1.6rem] border border-dashed border-border px-8 py-20 text-center"
    >
      <span className="grid size-14 place-items-center rounded-full border border-primary/25 text-primary">
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <h2
        className="mt-6 text-xl font-bold"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </motion.div>
  );
}
