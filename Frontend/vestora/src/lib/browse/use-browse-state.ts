"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BrowseSort, CommitmentFilter } from "@/lib/types/api";

export interface BrowseState {
  search: string;
  sector?: string;
  location?: string;
  stage?: string;
  commitment?: CommitmentFilter;
  sort: BrowseSort;
  /** Narrow to the viewer's own saved ventures. Also the target of /saved. */
  savedOnly: boolean;
  /** How many pages of results are currently revealed (append, not replace). */
  pages: number;
}

const SORTS: BrowseSort[] = ["newest", "momentum", "close", "largest", "backers", "discussed"];

function readState(sp: URLSearchParams): BrowseState {
  const sort = sp.get("sort") as BrowseSort | null;
  const commitment = sp.get("commitment");
  return {
    search: sp.get("q") ?? "",
    sector: sp.get("sector") ?? undefined,
    location: sp.get("location") ?? undefined,
    stage: sp.get("stage") ?? undefined,
    commitment:
      commitment === "open" || commitment === "committed" ? (commitment as CommitmentFilter) : undefined,
    sort: sort && SORTS.includes(sort) ? sort : "newest",
    savedOnly: sp.get("saved") === "1",
    pages: Math.max(1, Number(sp.get("pages") ?? 1) || 1),
  };
}

function writeState(state: BrowseState): string {
  const sp = new URLSearchParams();
  if (state.search) sp.set("q", state.search);
  if (state.sector) sp.set("sector", state.sector);
  if (state.location) sp.set("location", state.location);
  if (state.stage) sp.set("stage", state.stage);
  if (state.commitment) sp.set("commitment", state.commitment);
  if (state.sort !== "newest") sp.set("sort", state.sort);
  if (state.savedOnly) sp.set("saved", "1");
  if (state.pages > 1) sp.set("pages", String(state.pages));
  return sp.toString();
}

const SCROLL_KEY = "vestora:browse:scroll";

/**
 * The browse URL is the single source of truth for search, filters, sort and how
 * much of the list is revealed. That makes a filtered view shareable, survives a
 * refresh, and — with the scroll memory below — lets the user open a venture and
 * come back to exactly where they were instead of a reset page one.
 */
export function useBrowseState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(
    () => readState(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  // The text field stays local so typing is instant; the URL catches up on a debounce.
  const [searchDraft, setSearchDraft] = useState(state.search);
  const lastPushedSearch = useRef(state.search);

  // Keep the field in step when the URL changes from elsewhere (back button, chip
  // removal, reset) without clobbering what the user is mid-way through typing.
  useEffect(() => {
    if (state.search !== lastPushedSearch.current) {
      lastPushedSearch.current = state.search;
      setSearchDraft(state.search);
    }
  }, [state.search]);

  const apply = useCallback(
    (next: Partial<BrowseState>, { replace = true }: { replace?: boolean } = {}) => {
      // Any change to what is being asked for collapses the list back to one page,
      // unless the caller is explicitly revealing more.
      const merged: BrowseState = {
        ...state,
        ...next,
        pages: next.pages ?? 1,
      };
      const qs = writeState(merged);
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [pathname, router, state]
  );

  // Debounced commit of the search field into the URL.
  useEffect(() => {
    if (searchDraft === state.search) return;
    const id = setTimeout(() => {
      lastPushedSearch.current = searchDraft;
      apply({ search: searchDraft });
    }, 320);
    return () => clearTimeout(id);
  }, [searchDraft, state.search, apply]);

  const activeFilters = useMemo(
    () =>
      [
        state.stage && { key: "stage" as const, value: state.stage },
        state.sector && { key: "sector" as const, value: state.sector },
        state.location && { key: "location" as const, value: state.location },
        state.commitment && { key: "commitment" as const, value: state.commitment },
      ].filter(Boolean) as { key: "stage" | "sector" | "location" | "commitment"; value: string }[],
    [state]
  );

  const clearAll = useCallback(() => {
    setSearchDraft("");
    lastPushedSearch.current = "";
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const revealMore = useCallback(() => {
    apply({ pages: state.pages + 1 });
  }, [apply, state.pages]);

  return {
    state,
    searchDraft,
    setSearchDraft,
    apply,
    clearAll,
    revealMore,
    activeFilters,
    hasQuery: Boolean(state.search || activeFilters.length > 0),
  };
}

/**
 * Remembers where the user was standing when they opened a venture, and puts them
 * back there on return. Keyed by the full query string so it only restores into
 * the same result set it was captured from.
 */
export function useBrowseScrollMemory(key: string, ready: boolean) {
  const restored = useRef(false);

  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ key, y: window.scrollY }));
      } catch {
        /* private mode — the loop still works, just without the memory */
      }
    };
    // pagehide covers both navigation and tab close; click capture covers the
    // in-app soft navigation into a venture.
    window.addEventListener("pagehide", save);
    document.addEventListener("click", save, true);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("click", save, true);
    };
  }, [key]);

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { key: string; y: number };
      if (saved.key !== key || saved.y <= 0) return;
      // Wait for the revealed rows to lay out before jumping.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => window.scrollTo({ top: saved.y, behavior: "instant" as ScrollBehavior }));
      });
    } catch {
      /* ignore */
    }
  }, [ready, key]);
}

const VISITED_KEY = "vestora:browse:visited";

/** Marks the venture the user just came back from, so the grid can acknowledge it. */
export function rememberVisited(id: number) {
  try {
    sessionStorage.setItem(VISITED_KEY, String(id));
  } catch {
    /* ignore */
  }
}

/** Never changes for the life of the page — the value is written on the way out. */
const noopSubscribe = () => () => {};

function readVisited(): number | null {
  try {
    const raw = sessionStorage.getItem(VISITED_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function useLastVisited(): number | null {
  // Read through useSyncExternalStore rather than an effect: sessionStorage is an
  // external store, and this keeps the server snapshot (null) explicit instead of
  // rendering once and then setting state.
  return useSyncExternalStore(noopSubscribe, readVisited, () => null);
}
