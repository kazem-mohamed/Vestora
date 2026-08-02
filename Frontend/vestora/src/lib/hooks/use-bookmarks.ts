"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookmarksApi } from "@/lib/api/bookmarks";
import { useAuthStore } from "@/lib/auth/store";

/** The current user's set of saved project ids — shared by every bookmark button. */
export function useBookmarkIds() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["bookmark-ids", user?.id],
    queryFn: () => bookmarksApi.ids(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

/** Optimistic save/unsave toggle that patches the shared id set instantly. */
export function useToggleBookmark() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const key = ["bookmark-ids", user?.id];

  return useMutation({
    mutationFn: ({ projectId, saved }: { projectId: number; saved: boolean }) =>
      saved ? bookmarksApi.remove(projectId) : bookmarksApi.add(projectId),
    onMutate: async ({ projectId, saved }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<number[]>(key) ?? [];
      qc.setQueryData<number[]>(
        key,
        saved ? prev.filter((id) => id !== projectId) : [...prev, projectId]
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] });
    },
  });
}
