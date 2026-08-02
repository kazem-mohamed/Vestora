import { create } from "zustand";
import type { PresenceSnapshot } from "@/lib/realtime/chat";

/**
 * Live presence + typing state, fed by the shared SignalR connection
 * (see useChatRealtime). Kept out of React Query since it's ephemeral,
 * high-frequency, and not tied to any request lifecycle.
 */
interface ChatRealtimeState {
  online: Record<number, boolean>;
  lastSeen: Record<number, string | null>;
  typing: Record<number, boolean>; // partnerId -> is that partner typing to me
  setPresence: (userId: number, isOnline: boolean, lastSeenAt: string | null) => void;
  mergePresence: (list: PresenceSnapshot[]) => void;
  setTyping: (userId: number, isTyping: boolean) => void;
  reset: () => void;
}

export const useChatStore = create<ChatRealtimeState>((set) => ({
  online: {},
  lastSeen: {},
  typing: {},
  setPresence: (userId, isOnline, lastSeenAt) =>
    set((s) => ({
      online: { ...s.online, [userId]: isOnline },
      lastSeen: lastSeenAt != null ? { ...s.lastSeen, [userId]: lastSeenAt } : s.lastSeen,
    })),
  mergePresence: (list) =>
    set((s) => {
      const online = { ...s.online };
      const lastSeen = { ...s.lastSeen };
      for (const p of list) {
        online[p.userId] = p.isOnline;
        if (p.lastSeenAt != null) lastSeen[p.userId] = p.lastSeenAt;
      }
      return { online, lastSeen };
    }),
  setTyping: (userId, isTyping) => set((s) => ({ typing: { ...s.typing, [userId]: isTyping } })),
  reset: () => set({ online: {}, lastSeen: {}, typing: {} }),
}));
