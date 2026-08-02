import { api, API_URL } from "@/lib/api/client";
import type {
  ApiMessage,
  BrowseSort,
  CommitmentFilter,
  PagedResult,
  Project,
  ProjectCard,
  ProjectFacets,
  RoundOutcome,
} from "@/lib/types/api";

export interface ProjectListParams {
  search?: string;
  /** Spans Category and Industry — one concept to the person browsing. */
  sector?: string;
  location?: string;
  stage?: string;
  commitment?: CommitmentFilter;
  sort?: BrowseSort;
  page?: number;
  pageSize?: number;
}

/** Plain value lists for authoring surfaces (project form, onboarding). */
export interface ProjectFilters {
  categories: string[];
  industries: string[];
  locations: string[];
}

export interface ProjectInput {
  name: string;
  description: string;
  videoUrl?: string | null;
  topic?: string | null;
  category?: string | null;
  industry?: string | null;
  location?: string | null;
  investmentNeeded: number;
  stage?: string | null;
  valuation?: number | null;
  equityOffered?: number | null;
  useOfFunds?: string | null;
}

function toQuery(params: ProjectListParams): string {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.sector) q.set("sector", params.sector);
  if (params.location) q.set("location", params.location);
  if (params.stage) q.set("stage", params.stage);
  if (params.commitment) q.set("commitment", params.commitment);
  if (params.sort && params.sort !== "newest") q.set("sort", params.sort);
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const projectsApi = {
  // Public feed — no auth needed; keep the client from attaching/refreshing tokens.
  list: (params: ProjectListParams = {}) =>
    api.get<PagedResult<ProjectCard>>(`/api/projects${toQuery(params)}`, { auth: false }),

  /** Filter values with live counts, narrowed by the filters already applied. */
  facets: (params: Omit<ProjectListParams, "page" | "pageSize" | "sort"> = {}) =>
    api.get<ProjectFacets>(`/api/projects/facets${toQuery(params)}`, { auth: false }),

  filters: () => api.get<ProjectFilters>("/api/projects/filters", { auth: false }),

  // Anonymous-friendly, but NOT auth:false — the endpoint has a privileged
  // branch, and stripping the header meant a founder was anonymous on their own
  // listing and got a 404 for anything not yet approved. The header is only
  // attached when a token exists, so guests are unaffected.
  details: (id: number) => api.get<Project>(`/api/projects/details/${id}`),

  // Owner's own projects (Innovator dashboard / My Projects) — the full record.
  byOwner: (ownerId: number) => api.get<Project[]>(`/api/projects/${ownerId}`),

  /** A founder's ventures as browse cards, for the public profile grid. */
  ownerCards: (ownerId: number) => api.get<ProjectCard[]>(`/api/projects/${ownerId}/cards`),

  /** Where to go after reading a venture — same founder first, then same sector. */
  nextVentures: (projectId: number) =>
    api.get<{ byFounder: ProjectCard[]; bySector: ProjectCard[] }>(
      `/api/projects/${projectId}/next`,
      { auth: false }
    ),

  /** Founder pauses / closes / reopens a venture. */
  setLifecycle: (projectId: number, status: "Active" | "Paused" | "Closed") =>
    api.patch<{ message: string; status: string }>(`/api/projects/${projectId}/lifecycle`, { status }),

  /**
   * Ends the round and records how it ended.
   *
   * Separate from setLifecycle because this is not a status toggle: it concludes every
   * live relationship on the venture, notifies each backer, and removes the listing
   * from discovery. The outcome is stated by the founder — only they know whether a
   * round that reached 60% was a success or an abandonment.
   */
  closeRound: (projectId: number, outcome: RoundOutcome, note?: string) =>
    api.post<{
      message: string;
      outcome: string;
      closedAt: string;
      relationshipsConcluded: number;
    }>(`/api/projects/${projectId}/close-round`, { outcome, note }),

  // Create / edit / delete (Innovator, owner-guarded on the server)
  create: (input: ProjectInput) =>
    api.post<{ message: string; projectId: number }>("/api/projects", input),

  update: (id: number, input: ProjectInput) =>
    api.put<ApiMessage>(`/api/projects/${id}`, input),

  remove: (id: number) => api.del<ApiMessage>(`/api/projects/${id}`),

  // Images
  uploadImage: (projectId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ message: string; imageId: number }>(
      `/api/projects/${projectId}/images`,
      fd
    );
  },

  deleteImage: (imageId: number) =>
    api.del<ApiMessage>(`/api/projects/images/${imageId}`),

  // Discussion (auth required)
  addComment: (projectId: number, content: string) =>
    api.post<ApiMessage>(`/api/projects/${projectId}/comments`, { content }),

  addReply: (commentId: number, content: string) =>
    api.post<ApiMessage>(`/api/projects/comments/${commentId}/replies`, { content }),

  deleteComment: (commentId: number) =>
    api.del<ApiMessage>(`/api/projects/comments/${commentId}`),

  deleteReply: (replyId: number) =>
    api.del<ApiMessage>(`/api/projects/replies/${replyId}`),
};

/**
 * Same-origin URL for a project image. Proxied by a Next rewrite to the API
 * (see next.config.ts) so the picture can go through the image optimizer and
 * isn't subject to cross-origin restrictions.
 */
export function projectImageUrl(imageId: number): string {
  return `/venture-image/${imageId}`;
}

/** Direct API URL, for the rare case something must bypass the proxy. */
export function projectImageDirectUrl(imageId: number): string {
  return `${API_URL}/api/projects/images/${imageId}`;
}
