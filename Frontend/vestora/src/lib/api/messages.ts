import { api, API_URL } from "@/lib/api/client";
import { authStore } from "@/lib/auth/store";
import type { ConversationSummary, Message } from "@/lib/types/api";

export const messagesApi = {
  // Conversation summaries for the current user (newest first, with unread counts).
  conversations: (userId: number) =>
    api.get<ConversationSummary[]>(`/api/Message/conversations/${userId}`),

  // Full thread between the current user and a partner (chronological).
  // Pass projectId to read only the messages belonging to one venture — that is how
  // a deal room shows its own conversation without a second chat system.
  thread: (userId: number, partnerId: number, projectId?: number) =>
    api.get<Message[]>(
      `/api/Message/conversation/${userId}/${partnerId}${
        projectId ? `?projectId=${projectId}` : ""
      }`
    ),

  // REST fallback for sending (the SignalR hub is the primary path).
  // projectId ties the message to a venture; the server verifies the two people
  // actually have a relationship on it before honouring the claim.
  send: (receiverId: number, content: string, projectId?: number) =>
    api.post<{ message: string }>("/api/Message/send", {
      receiverId,
      content,
      projectId,
    }),

  // Send an image attachment (optional caption) over multipart; the server
  // returns the created message and broadcasts it to the receiver.
  sendAttachment: (receiverId: number, file: File, caption: string) => {
    const fd = new FormData();
    fd.append("ReceiverId", String(receiverId));
    if (caption.trim()) fd.append("Caption", caption.trim());
    fd.append("File", file);
    return api.post<{ message: string; data: Message }>("/api/Message/send-attachment", fd);
  },

  // Attachments are private (bearer-guarded), so an <img src> can't reach them.
  // Fetch the bytes with auth and hand back an object URL to render.
  attachmentObjectUrl: async (messageId: number): Promise<string> => {
    const token = authStore.getAccessToken();
    const res = await fetch(`${API_URL}/api/Message/attachment/${messageId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to load attachment");
    return URL.createObjectURL(await res.blob());
  },

  // Mark every message from a partner as read (called when a thread opens).
  markRead: (partnerId: number) =>
    api.post<{ updated: number }>(`/api/Message/read/${partnerId}`, {}),

  unreadCount: async (): Promise<number> => {
    const r = await api.get<{ count: number }>("/api/Message/unread-count");
    return r.count;
  },
};
