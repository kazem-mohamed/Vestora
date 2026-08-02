import { api } from "@/lib/api/client";
import type {
  AdminRevenue,
  AdminTransactionRow,
  CheckoutSession,
  FundingRequest,
  InvestorPayments,
  PagedResult,
  PaymentConfig,
  PaymentStatus,
  PaymentTransaction,
} from "@/lib/types/api";

/**
 * Funding and sandbox payments.
 *
 * Every amount is decided on the server from a stored row — nothing here sends a
 * figure and expects it to be honoured, and nothing here treats a browser
 * arriving at a success URL as evidence that a payment happened. `verify` is the
 * only way a return trip becomes a settled transaction, and it works by asking
 * the provider.
 */
export const paymentsApi = {
  /** Provider, fee rate, and whether this is a sandbox. Public. */
  config: () => api.get<PaymentConfig>("/api/payments/config", { auth: false }),

  // ---- Founder: asking for the agreed money ----

  createFundingRequest: (investmentId: number, input: { amount: number; note?: string }) =>
    api.post<FundingRequest>(`/api/payments/investments/${investmentId}/funding-request`, input),

  fundingRequestForInvestment: (investmentId: number) =>
    api.get<FundingRequest | null>(`/api/payments/investments/${investmentId}/funding-request`),

  fundingRequest: (id: number) => api.get<FundingRequest>(`/api/payments/funding-requests/${id}`),

  cancelFundingRequest: (id: number, reason?: string) =>
    api.post<FundingRequest>(`/api/payments/funding-requests/${id}/cancel`, { reason }),

  // ---- Investor: paying it ----

  /** Opens a hosted checkout. Returns the existing live one if there is one. */
  createCheckout: (fundingRequestId: number) =>
    api.post<CheckoutSession>(`/api/payments/funding-requests/${fundingRequestId}/checkout`),

  /**
   * The trusted confirmation. Called on return from the provider — the redirect
   * itself proves only that a browser came back.
   */
  verify: (transactionId: number) =>
    api.post<PaymentTransaction>(`/api/payments/transactions/${transactionId}/verify`),

  cancelAttempt: (transactionId: number) =>
    api.post<PaymentTransaction>(`/api/payments/transactions/${transactionId}/cancel`),

  transaction: (id: number) => api.get<PaymentTransaction>(`/api/payments/transactions/${id}`),

  /** The investor's money in one response: owed, settled, failed. */
  mine: () => api.get<InvestorPayments>("/api/payments/mine"),

  // ---- Sandbox checkout (simulated provider only) ----

  describeSandboxSession: (sessionId: string) =>
    api.get<{ sessionId: string; amount: number; currency: string; reference: string }>(
      `/api/payments/sandbox/sessions/${encodeURIComponent(sessionId)}`
    ),

  /** Stands in for typing a test card: pick the outcome, the rest behaves identically. */
  resolveSandboxSession: (sessionId: string, outcome: "success" | "failure" | "cancel") =>
    api.post<{ resolved: boolean; outcome: string }>(
      `/api/payments/sandbox/sessions/${encodeURIComponent(sessionId)}/resolve`,
      { outcome }
    ),
};

/** Vestora's own economics. Admin only. */
export const revenueApi = {
  overview: () => api.get<AdminRevenue>("/api/admin/revenue"),

  transactions: (params: {
    status?: PaymentStatus | "";
    q?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    qs.set("page", String(params.page ?? 1));
    qs.set("pageSize", String(params.pageSize ?? 25));
    return api.get<PagedResult<AdminTransactionRow>>(`/api/admin/revenue/transactions?${qs}`);
  },

  /** Reverses a settled transaction. Funding totals and revenue both fall out of it. */
  refund: (transactionId: number, reason?: string) =>
    api.post<PaymentTransaction>(`/api/admin/revenue/transactions/${transactionId}/refund`, {
      reason,
    }),
};
