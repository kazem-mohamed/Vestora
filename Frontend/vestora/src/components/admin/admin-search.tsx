"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi } from "@/lib/api/admin";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { AdminSearchHit, AdminSearchResults } from "@/lib/types/api";

/**
 * One box, every record.
 *
 * Reached from anywhere in the admin area with ⌘K / Ctrl-K, because the moment an
 * administrator needs it they are already looking at a different screen — a support
 * message quoting a payment reference does not arrive while the revenue table happens
 * to be open.
 *
 * Results stay grouped by kind. Merging a person and a transaction into one ranked list
 * would require a relevance score, and a moderation tool whose ordering cannot be
 * explained is a tool that gets second-guessed.
 */
export function AdminSearch() {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 250);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A search left open from last time is stale by definition.
  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-search", debounced],
    queryFn: ({ signal }) => adminApi.search(debounced, signal),
    enabled: open && debounced.trim().length >= 2,
  });

  const groups: { key: keyof AdminSearchResults; labelKey: string }[] = [
    { key: "users", labelKey: "admin.search.users" },
    { key: "ventures", labelKey: "admin.search.ventures" },
    { key: "deals", labelKey: "admin.search.deals" },
    { key: "transactions", labelKey: "admin.search.transactions" },
    { key: "reports", labelKey: "admin.search.reports" },
  ];

  const total = data
    ? groups.reduce((n, g) => n + (data[g.key] as AdminSearchHit[]).length, 0)
    : 0;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        data-cursor="hover"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Search className="size-4 shrink-0" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate text-start">{t("admin.search.open")}</span>
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-numeric text-[10px] text-muted-foreground/70 sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("admin.search.title")}</DialogTitle>
            <DialogDescription>{t("admin.search.hint")}</DialogDescription>
          </DialogHeader>

          <input
            ref={inputRef}
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("admin.search.placeholder")}
            className="h-11 w-full rounded-xl border border-input bg-card/60 px-4 text-sm outline-none focus-visible:border-primary/60"
          />

          <div className="max-h-[55vh] min-h-24 overflow-y-auto">
            {term.trim().length < 2 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.search.typeMore")}</p>
            ) : isFetching && !data ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.search.searching")}</p>
            ) : total === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("admin.search.none")}</p>
            ) : (
              <div className="space-y-5">
                {groups.map((g) => {
                  const hits = (data?.[g.key] ?? []) as AdminSearchHit[];
                  if (hits.length === 0) return null;
                  return (
                    <section key={g.key}>
                      <h3 className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {t(g.labelKey)}
                      </h3>
                      <ul className="divide-y divide-border/50">
                        {hits.map((hit) => (
                          <li key={`${g.key}-${hit.id}`}>
                            <button
                              type="button"
                              data-cursor="hover"
                              onClick={() => go(hit.href)}
                              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-start transition-colors hover:bg-foreground/[0.04]"
                            >
                              <span className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "block truncate text-sm font-medium",
                                    hit.muted && "text-muted-foreground line-through"
                                  )}
                                >
                                  {hit.title}
                                </span>
                                {hit.subtitle && (
                                  <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                                )}
                              </span>
                              {hit.badge && (
                                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] leading-5 text-muted-foreground">
                                  {hit.badge}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
