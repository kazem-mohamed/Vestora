"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Compass,
  Landmark,
  MapPin,
  Layers,
  Search as SearchIcon,
  Trash2,
  Wallet,
} from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { signalsApi } from "@/lib/api/deals";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { SavedSearch } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Rebuilds the browse/directory URL a saved search stands for. */
function hrefFor(s: SavedSearch): string {
  const p = new URLSearchParams();
  if (s.search) p.set("search", s.search);
  if (s.sector) p.set("sector", s.sector);
  if (s.location) p.set("location", s.location);
  if (s.stage) p.set("stage", s.stage);
  if (s.commitment) p.set("commitment", s.commitment);
  const base = s.scope === "investors" ? "/investors" : "/projects";
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

/** The criteria, as the chips they were when the search was saved. */
function criteria(s: SavedSearch) {
  return [
    { icon: SearchIcon, value: s.search },
    { icon: Layers, value: s.sector },
    { icon: MapPin, value: s.location },
    { icon: Compass, value: s.stage },
    { icon: Wallet, value: s.commitment },
  ].filter((c) => c.value);
}

/**
 * Kept searches.
 *
 * The API for these has existed since the signals work — a member could save a query
 * from the capital directory, and the action band could count what was new — but there
 * was nowhere to see, revisit or delete them. A standing interest you cannot review is
 * a leak, not a feature: the count kept climbing with no way to reach the thing it
 * counted.
 *
 * The page is a register rather than a card grid. Each row is a numbered entry with
 * its criteria spelled out, because the question someone brings here is "what exactly
 * did I ask for?" — and a card would hide that behind a title. Rows carrying new
 * matches lift toward the reader and wear the gold rule; the rest sit flat.
 */
export default function SearchesPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => signalsApi.searches(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["saved-searches"] });
    // The obligation band counts new matches, so it goes stale with this list.
    qc.invalidateQueries({ queryKey: ["action-center"] });
  };

  const remove = useMutation({
    mutationFn: (id: number) => signalsApi.deleteSearch(id),
    onSuccess: () => {
      toast.success(t("searches.removed"));
      setConfirmId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markSeen = useMutation({
    mutationFn: (id: number) => signalsApi.markSeen(id),
    onSuccess: invalidate,
  });

  const searches = data ?? [];
  const withNew = searches.filter((s) => s.newMatches > 0).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      {/* ================= MASTHEAD ================= */}
      <span className="block overflow-hidden pb-1">
        <motion.h1
          initial={reduce ? { opacity: 0 } : { y: "110%" }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          className={cn(
            "text-4xl font-bold sm:text-5xl",
            rtl ? "leading-[1.25]" : "leading-[1.05] tracking-[-0.02em]"
          )}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("searches.title")}
        </motion.h1>
      </span>
      <motion.p
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground"
      >
        {t("searches.sub")}
      </motion.p>

      {/* ================= BODY ================= */}
      <div className="mt-10">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : searches.length === 0 ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative overflow-hidden rounded-[1.6rem] border border-border bg-card/50 px-6 py-14 text-center backdrop-blur-sm"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            />
            <span
              aria-hidden
              className="mx-auto grid size-12 place-items-center rounded-full border border-border/70 text-muted-foreground/70"
            >
              <Bookmark className="size-5" strokeWidth={1.6} />
            </span>
            <p className="mt-4 text-lg font-medium" style={{ fontFamily: "var(--font-heading)" }}>
              {t("searches.empty")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("searches.emptyHint")}
            </p>
            {/* Both scopes, because either role can keep either kind of search. */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/projects"
                data-cursor="hover"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs outline-none transition-colors duration-300 hover:border-primary/50 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <Compass className="size-3.5" strokeWidth={1.8} />
                {t("nav.browse")}
              </Link>
              <Link
                href="/investors"
                data-cursor="hover"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs outline-none transition-colors duration-300 hover:border-primary/50 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <Landmark className="size-3.5" strokeWidth={1.8} />
                {t("cap.nav")}
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {withNew > 0 && (
              <p className="mb-5 text-xs text-muted-foreground">
                {t("searches.newSummary").replace("{n}", String(withNew))}
              </p>
            )}

            <ol className="divide-y divide-border/50 border-y border-border/50">
              {searches.map((s, i) => {
                const isNew = s.newMatches > 0;
                const chips = criteria(s);
                return (
                  <motion.li
                    key={s.id}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: EASE }}
                    className={cn(
                      "group/s relative py-5 transition-colors duration-300",
                      isNew && "bg-primary/[0.03]"
                    )}
                  >
                    {isNew && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-4 start-0 w-px bg-primary/70"
                      />
                    )}

                    <div className="flex items-start gap-4 ps-3">
                      {/* Engraved index — the register device used across Vestora. */}
                      <span
                        aria-hidden
                        className="font-numeric mt-0.5 shrink-0 text-[11px] text-muted-foreground/60"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <Link
                            href={hrefFor(s)}
                            onClick={() => isNew && markSeen.mutate(s.id)}
                            data-cursor="hover"
                            className="group/l inline-flex min-w-0 items-center gap-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
                          >
                            <span
                              className="truncate text-[15px] font-medium transition-colors duration-300 group-hover/l:text-primary"
                              style={{ fontFamily: "var(--font-heading)" }}
                            >
                              {s.name}
                            </span>
                            <Arrow
                              className={cn(
                                "size-3.5 shrink-0 text-muted-foreground/0 transition-[color,transform] duration-300 group-hover/l:text-primary",
                                rtl
                                  ? "group-hover/l:-translate-x-0.5"
                                  : "group-hover/l:translate-x-0.5"
                              )}
                            />
                          </Link>

                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-px text-[10px]",
                              s.scope === "investors"
                                ? "border-bronze/30 text-bronze"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {t(
                              s.scope === "investors"
                                ? "searches.scope.investors"
                                : "searches.scope.ventures"
                            )}
                          </span>
                        </div>

                        {/* The criteria, spelled out. This is the reason the page exists. */}
                        {chips.length > 0 && (
                          <ul className="mt-2.5 flex flex-wrap gap-1.5">
                            {chips.map((c, ci) => (
                              <li
                                key={ci}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground"
                              >
                                <c.icon className="size-3 shrink-0" strokeWidth={1.9} />
                                {c.value}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                          {isNew ? (
                            <span className="font-numeric text-primary">
                              {t("searches.new").replace("{n}", String(s.newMatches))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/80">
                              {t("searches.noNew")}
                            </span>
                          )}
                          <span className="font-numeric text-muted-foreground/80">
                            {t("searches.total").replace("{n}", String(s.totalMatches))}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        data-cursor="hover"
                        aria-label={t("searches.remove")}
                        onClick={() => setConfirmId(s.id)}
                        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground/60 outline-none transition-colors duration-300 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/25"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.8} />
                      </button>
                    </div>

                    {/* Inline confirmation. A dialog for one destructive row on a short
                        list is heavier than the decision warrants. */}
                    <AnimatePresence initial={false}>
                      {confirmId === s.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 flex flex-wrap items-center gap-3 border-s-2 border-destructive/40 ps-3">
                            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                              {t("searches.confirm")}
                            </p>
                            <button
                              type="button"
                              data-cursor="hover"
                              onClick={() => setConfirmId(null)}
                              className="rounded-full border border-border px-3.5 py-1.5 text-[11px] text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
                            >
                              {t("form.cancel")}
                            </button>
                            <button
                              type="button"
                              data-cursor="hover"
                              disabled={remove.isPending}
                              onClick={() => remove.mutate(s.id)}
                              className="rounded-full bg-destructive px-3.5 py-1.5 text-[11px] font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-60"
                            >
                              {t("searches.remove")}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ol>

            {/* Said once, at the bottom: these are in-app only. Nothing here promises
                an email that is not being sent. */}
            <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
              {t("searches.inAppOnly")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
