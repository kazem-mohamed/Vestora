import { api } from "@/lib/api/client";
import type { FounderDashboard, InvestorDashboard } from "@/lib/types/api";

export const dashboardApi = {
  // Aggregated founder control-room payload (Innovator only).
  founder: () => api.get<FounderDashboard>("/api/dashboard/founder"),

  // Aggregated investor command-centre payload (Investor only).
  investor: () => api.get<InvestorDashboard>("/api/dashboard/investor"),
};

/** Founder moves a relationship along the pipeline (or declines it). */
export const pipelineApi = {
  // Accept or decline addressed by the relationship itself.
  //
  // notificationsApi has the same two verbs keyed on a notification id, which is
  // the right shape when the decision is taken from the notification feed. It is
  // the wrong shape everywhere else: that row is deleted when the counterpart
  // request is declined and pages out of the feed as it ages, and the pipeline
  // board was left with disabled buttons and no way in.
  approveSupport: (investmentId: number) =>
    api.post<{ message: string }>(
      `/api/investor/investments/${investmentId}/approve-support`,
      {}
    ),

  rejectSupport: (investmentId: number) =>
    api.post<{ message: string }>(`/api/investor/${investmentId}/reject-support`, {}),

  setStage: (investmentId: number, stage: string, reason?: string) =>
    api.patch<{ message: string; stage: string }>(
      `/api/investor/investments/${investmentId}/stage`,
      { stage, reason: reason ?? null }
    ),

  setFounderNote: (investmentId: number, note: string) =>
    api.put<{ message: string }>(
      `/api/investor/investments/${investmentId}/founder-note`,
      { note }
    ),

  setInvestorNote: (investmentId: number, note: string) =>
    api.put<{ message: string }>(
      `/api/investor/investments/${investmentId}/investor-note`,
      { note }
    ),
};
