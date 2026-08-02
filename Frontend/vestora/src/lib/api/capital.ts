import { api } from "@/lib/api/client";
import type {
  CapitalFacets,
  CapitalSort,
  InvestorCard,
  PagedResult,
  TicketBand,
} from "@/lib/types/api";

export interface CapitalListParams {
  search?: string;
  sector?: string;
  band?: TicketBand;
  trackRecord?: boolean;
  sort?: CapitalSort;
  page?: number;
  pageSize?: number;
}

function toQuery(params: object): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * The capital directory. Founder-only on the server, so no `auth: false` here —
 * the token is required, not merely helpful.
 */
export const capitalApi = {
  list: (params: CapitalListParams = {}) =>
    api.get<PagedResult<InvestorCard>>(`/api/capital${toQuery(params)}`),

  facets: (params: Omit<CapitalListParams, "page" | "pageSize" | "sort"> = {}) =>
    api.get<CapitalFacets>(`/api/capital/facets${toQuery(params)}`),

  /** The founder's own open rounds, so an approach can name the venture it is about. */
  myVentures: () =>
    api.get<{ id: number; name: string; moderationStatus: string }[]>(
      "/api/capital/my-ventures"
    ),
};
