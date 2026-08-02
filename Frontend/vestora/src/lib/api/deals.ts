import { api } from "@/lib/api/client";
import type { ActionCenter, DealRoom, DealSummary, SavedSearch } from "@/lib/types/api";

/**
 * The relationship workspace. Every call is participation-gated on the server —
 * an id here proves nothing about who may read it.
 */
export const dealsApi = {
  /** Relationships the caller is part of, either side. */
  mine: (activeOnly = false) =>
    api.get<DealSummary[]>(`/api/deals${activeOnly ? "?activeOnly=true" : ""}`),

  get: (investmentId: number) => api.get<DealRoom>(`/api/deals/${investmentId}`),

  ask: (investmentId: number, question: string) =>
    api.post<{ message: string; id: number }>(`/api/deals/${investmentId}/questions`, {
      question,
    }),

  answer: (questionId: number, answer: string) =>
    api.put<{ message: string }>(`/api/deals/questions/${questionId}/answer`, { answer }),

  withdrawQuestion: (questionId: number) =>
    api.post<{ message: string }>(`/api/deals/questions/${questionId}/withdraw`, {}),

  requestDocument: (investmentId: number, title: string, note?: string) =>
    api.post<{ message: string; id: number }>(
      `/api/deals/${investmentId}/document-requests`,
      { title, note }
    ),

  resolveDocumentRequest: (
    requestId: number,
    input: { status: "Fulfilled" | "Declined"; documentId?: number; declinedReason?: string }
  ) => api.put<{ message: string }>(`/api/deals/document-requests/${requestId}`, input),

  withdrawDocumentRequest: (requestId: number) =>
    api.post<{ message: string }>(`/api/deals/document-requests/${requestId}/withdraw`, {}),

  /** The caller's own private note. The other side never receives it. */
  saveNote: (investmentId: number, note: string) =>
    api.put<{ message: string }>(`/api/deals/${investmentId}/note`, { answer: note }),
};

/**
 * Kept searches and the action centre.
 *
 * In-app only by design: the stored query and its watermark are exactly what an
 * email digest would read, so adding one later needs no schema change.
 */
export const signalsApi = {
  searches: () => api.get<SavedSearch[]>("/api/signals/searches"),

  saveSearch: (input: {
    name: string;
    scope: "ventures" | "investors";
    search?: string;
    sector?: string;
    location?: string;
    stage?: string;
    commitment?: string;
  }) => api.post<{ message: string; id: number }>("/api/signals/searches", input),

  markSeen: (id: number) =>
    api.post<{ message: string }>(`/api/signals/searches/${id}/seen`, {}),

  deleteSearch: (id: number) =>
    api.del<{ message: string }>(`/api/signals/searches/${id}`),

  actionCenter: () => api.get<ActionCenter>("/api/signals/action-center"),
};
