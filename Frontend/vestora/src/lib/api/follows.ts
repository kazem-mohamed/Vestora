import { api } from "@/lib/api/client";
import type { PublicUserProfile } from "@/lib/types/api";

type Toggle = { message: string; following: boolean };

export const followsApi = {
  follow: (userId: number) => api.post<Toggle>(`/api/follows/${userId}`, {}),
  unfollow: (userId: number) => api.del<Toggle>(`/api/follows/${userId}`),
  followingIds: () => api.get<number[]>("/api/follows/following/ids"),
  followers: (userId: number) =>
    api.get<PublicUserProfile[]>(`/api/follows/${userId}/followers`, { auth: false }),
  following: (userId: number) =>
    api.get<PublicUserProfile[]>(`/api/follows/${userId}/following`, { auth: false }),
};
