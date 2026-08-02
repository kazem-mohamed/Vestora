"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { followsApi } from "@/lib/api/follows";
import { useAuthStore } from "@/lib/auth/store";
import type { PublicProfileDetail } from "@/lib/types/api";

/** The current user's set of followed user ids — shared by every follow button. */
export function useFollowingIds() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["following-ids", user?.id],
    queryFn: () => followsApi.followingIds(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

/**
 * Optimistic follow/unfollow. Patches the shared id set (instant button state)
 * and, if the target profile is cached, its follower count + follow flag so the
 * whole hero updates without a round-trip.
 */
export function useToggleFollow() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const key = ["following-ids", user?.id];

  return useMutation({
    mutationFn: ({ userId, following }: { userId: number; following: boolean }) =>
      following ? followsApi.unfollow(userId) : followsApi.follow(userId),
    onMutate: async ({ userId, following }) => {
      await qc.cancelQueries({ queryKey: key });
      const prevIds = qc.getQueryData<number[]>(key) ?? [];
      qc.setQueryData<number[]>(
        key,
        following ? prevIds.filter((id) => id !== userId) : [...prevIds, userId]
      );

      const profileKey = ["profile", userId];
      const prevProfile = qc.getQueryData<PublicProfileDetail>(profileKey);
      if (prevProfile) {
        qc.setQueryData<PublicProfileDetail>(profileKey, {
          ...prevProfile,
          isFollowedByMe: !following,
          followersCount: Math.max(0, prevProfile.followersCount + (following ? -1 : 1)),
        });
      }
      return { prevIds, prevProfile, userId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prevIds) qc.setQueryData(key, ctx.prevIds);
      if (ctx?.prevProfile) qc.setQueryData(["profile", ctx.userId], ctx.prevProfile);
    },
    onSettled: (_d, _e, { userId }) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}
