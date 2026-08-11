import { api, API_URL } from "@/lib/api/client";
import { authStore } from "@/lib/auth/store";
import type { ActionCenter, DealRoom, DealSummary, SavedSearch, TermSheet } from "@/lib/types/api";

/**
 * The relationship workspace. Every call is participation-gated on the server —
 * an id here proves nothing about who may read it.
 */
export const dealsApi = {
  /** Relationships the caller is part of, either side. */
  mine: (activeOnly = false) =>
    api.get<DealSummary[]>(`/api/deals${activeOnly ? "?activeOnly=true" : ""}`),

  get: (investmentId: number) => api.get<DealRoom>(`/api/deals/${investmentId}`),

  /** Pass `parentQuestionId` to push back on an answer rather than start a new thread. */
  ask: (investmentId: number, question: string, parentQuestionId?: number) =>
    api.post<{ message: string; id: number }>(`/api/deals/${investmentId}/questions`, {
      question,
      parentQuestionId: parentQuestionId ?? null,
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
    input: {
      status: "Fulfilled" | "Declined";
      documentId?: number;
      responseNote?: string;
      declinedReason?: string;
    }
  ) => api.put<{ message: string }>(`/api/deals/document-requests/${requestId}`, input),

  /**
   * The investor attaches what they were asked for. Held on the request, never
   * promoted to a venture document — a data room is readable by every approved
   * backer, and a bank letter is not for them.
   */
  uploadDocumentResponse: (requestId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ message: string; fileName: string; sizeBytes: number }>(
      `/api/deals/document-requests/${requestId}/upload`,
      fd
    );
  },

  /**
   * The attachment is bearer-guarded, so a plain <a href> cannot reach it. Fetch the
   * bytes with auth and hand back an object URL the caller can click.
   */
  documentResponseObjectUrl: async (requestId: number): Promise<string> => {
    const token = authStore.getAccessToken();
    const res = await fetch(`${API_URL}/api/deals/document-requests/${requestId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to load the attachment");
    return URL.createObjectURL(await res.blob());
  },

  withdrawDocumentRequest: (requestId: number) =>
    api.post<{ message: string }>(`/api/deals/document-requests/${requestId}/withdraw`, {}),

  // ---- Terms ----
  //
  // Either side proposes; the other side's acceptance is what decides anything.

  proposeTerms: (
    investmentId: number,
    input: {
      amount: number;
      equityPct?: number | null;
      valuation?: number | null;
      useOfFunds?: string | null;
      otherTerms?: string | null;
    }
  ) => api.post<TermSheet>(`/api/deals/${investmentId}/terms`, input),

  acceptTerms: (sheetId: number) =>
    api.post<TermSheet>(`/api/deals/terms/${sheetId}/accept`, {}),

  declineTerms: (sheetId: number, reason: string) =>
    api.post<TermSheet>(`/api/deals/terms/${sheetId}/decline`, { reason }),

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
