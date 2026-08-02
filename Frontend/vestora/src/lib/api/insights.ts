import { api } from "@/lib/api/client";
import type { VentureInsights } from "@/lib/types/api";

/**
 * Founder insights. Owner-only on the server — passing someone else's venture id
 * returns 403, so nothing here is gated on the client.
 */
export const insightsApi = {
  venture: (projectId: number) =>
    api.get<VentureInsights>(`/api/insights/venture/${projectId}`),
};
