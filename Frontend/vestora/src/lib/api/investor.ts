import { api } from "@/lib/api/client";
import type {
  Backer,
  InvestmentActivity,
  InvestmentSummary,
  MySupport,
  Project,
} from "@/lib/types/api";

export interface SupportRequest {
  investorId: number;
  projectId: number;
  amount: number;
  contactMethod: string;
}

export type SupportStatus = "none" | "pending" | "approved";

export const investorApi = {
  // Record support for a project (Investor only; owner can't back their own).
  support: (projectId: number, body: SupportRequest) =>
    api.post<{ message: string; contactMethod: string }>(
      `/api/investor/${projectId}/support`,
      body
    ),

  /**
   * The current investor's standing with one venture — the relationship status AND
   * where it sits on the money axis, so the venture page can offer "Complete
   * investment" at the exact moment it becomes true.
   *
   * The status string keeps its lower-casing for the callers that compare it;
   * `fundingState` is the field anything new should read.
   */
  mySupport: async (projectId: number): Promise<MySupport> => {
    const r = await api.get<MySupport>(`/api/investor/${projectId}/my-support`);
    return { ...r, status: (r.status ?? "none").toLowerCase() };
  },

  // Investor portfolio
  supportedProjects: (investorId: number) =>
    api.get<Project[]>(`/api/investor/${investorId}/supported-projects`),

  summary: (investorId: number) =>
    api.get<InvestmentSummary>(`/api/investor/${investorId}/investment-summary`),

  // The backend wraps activities in `{ activities: [...] }`; unwrap to a bare list.
  activities: async (investorId: number) => {
    const res = await api.get<{ activities?: InvestmentActivity[] }>(
      `/api/investor/${investorId}/activities`
    );
    return res.activities ?? [];
  },

  // Founder-only: who has backed a project (pending + approved) with how to
  // reach them — the durable answer to "an investor was approved, now what?".
  backers: (projectId: number) => api.get<Backer[]>(`/api/investor/${projectId}/backers`),
};
