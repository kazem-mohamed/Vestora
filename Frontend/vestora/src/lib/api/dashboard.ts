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
