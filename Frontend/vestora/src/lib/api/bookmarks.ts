import { api } from "@/lib/api/client";
import type { Project } from "@/lib/types/api";

type Toggle = { message: string; saved: boolean };

export const bookmarksApi = {
  add: (projectId: number) => api.post<Toggle>(`/api/bookmarks/${projectId}`, {}),
  remove: (projectId: number) => api.del<Toggle>(`/api/bookmarks/${projectId}`),
  list: () => api.get<Project[]>("/api/bookmarks"),
  ids: () => api.get<number[]>("/api/bookmarks/ids"),
};
