import { api } from "@/lib/api/client";
import type {
  FeedResponse,
  FeedType,
  ProjectAnalytics,
  EndorsementSummary,
} from "@/lib/types/api";

export const engagementApi = {
  // Fire-and-forget view ping (guest-friendly; sends the bearer when present).
  trackView: (projectId: number) =>
    api.post<void>(`/api/projects/${projectId}/view`, {}).catch(() => {}),

  analytics: (projectId: number) =>
    api.get<ProjectAnalytics>(`/api/projects/${projectId}/analytics`),

  // Endorsements replaced the 1–5 star review. The route is unchanged so existing
  // rows and links keep working; the payload is now traits rather than a score.
  reviews: (projectId: number) =>
    api.get<EndorsementSummary>(`/api/projects/${projectId}/reviews`, { auth: true }),

  submitReview: (
    projectId: number,
    input: {
      communicative: boolean;
      transparent: boolean;
      deliveredOnPlan: boolean;
      wouldBackAgain: boolean;
      content?: string;
    }
  ) => api.post<{ message: string }>(`/api/projects/${projectId}/reviews`, input),
};

export const reportsApi = {
  submit: (projectId: number, reason: string, details?: string) =>
    api.post<{ message: string }>("/api/reports", { projectId, reason, details }),
};

export const feedApi = {
  list: (opts: { type?: FeedType; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (opts.type) q.set("type", opts.type);
    q.set("page", String(opts.page ?? 1));
    q.set("pageSize", String(opts.pageSize ?? 20));
    return api.get<FeedResponse>(`/api/feed?${q.toString()}`);
  },
};
