"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api/messages";
import { ensureChatStarted, getPresence, sendChatMessage } from "@/lib/realtime/chat";
import { useChatStore } from "@/lib/realtime/chat-store";
import { useAuthStore } from "@/lib/auth/store";
import type { Message } from "@/lib/types/api";

/** Total unread messages — drives the header inbox badge. */
export function useUnreadCount() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["msg-unread", user?.id],
    queryFn: () => messagesApi.unreadCount(),
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useConversations() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => messagesApi.conversations(user!.id),
    enabled: !!user,
  });
}

export function useThread(partnerId: number | null) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["thread", user?.id, partnerId],
    queryFn: () => messagesApi.thread(user!.id, partnerId!),
    enabled: !!user && !!partnerId,
  });
}

/** Optimistic send over the hub; the caller echo (ReceiveMessage) replaces the bubble. */
export function useSendMessage(partnerId: number) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const key = ["thread", user?.id, partnerId];

  return useMutation({
    mutationFn: (content: string) => sendChatMessage(partnerId, content),
    onMutate: (content) => {
      const id = -Date.now();
      const optimistic: Message = {
        id,
        content,
        sentAt: new Date().toISOString(),
        senderId: user!.id,
        receiverId: partnerId,
        isRead: false,
        pending: true,
      };
      qc.setQueryData<Message[]>(key, (old = []) => [...old, optimistic]);
      return { id };
    },
    // Keep the bubble but flag it failed so the thread can offer a retry.
    onError: (_err, _content, ctx) => {
      qc.setQueryData<Message[]>(key, (old = []) =>
        old.map((m) => (m.id === ctx?.id ? { ...m, pending: false, failed: true } : m))
      );
    },
  });
}

/**
 * Optimistic image send over multipart: shows a local preview immediately, then
 * swaps in the server row on success (keeping the preview URL to avoid a
 * redundant download). Broadcast to the receiver happens server-side.
 */
export function useSendAttachment(partnerId: number) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const key = ["thread", user?.id, partnerId];

  return useMutation({
    mutationFn: (vars: { file: File; caption: string }) =>
      messagesApi.sendAttachment(partnerId, vars.file, vars.caption),
    onMutate: (vars) => {
      const id = -Date.now();
      const localPreviewUrl = URL.createObjectURL(vars.file);
      const optimistic: Message = {
        id,
        content: vars.caption.trim(),
        sentAt: new Date().toISOString(),
        senderId: user!.id,
        receiverId: partnerId,
        isRead: false,
        attachmentType: vars.file.type,
        attachmentName: vars.file.name,
        localPreviewUrl,
        pending: true,
      };
      qc.setQueryData<Message[]>(key, (old = []) => [...old, optimistic]);
      return { id, localPreviewUrl };
    },
    onSuccess: (res, _vars, ctx) => {
      qc.setQueryData<Message[]>(key, (old = []) =>
        old.map((m) =>
          m.id === ctx?.id ? { ...res.data, isRead: false, localPreviewUrl: ctx?.localPreviewUrl } : m
        )
      );
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData<Message[]>(key, (old = []) =>
        old.map((m) => (m.id === ctx?.id ? { ...m, pending: false, failed: true } : m))
      );
    },
  });
}

export function useMarkRead() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: number) => messagesApi.markRead(partnerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg-unread", user?.id] });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
}

/**
 * Starts the shared hub connection and routes incoming messages + notifications
 * into the query cache: messages append to the open thread (de-duping the
 * sender's optimistic bubble) and refresh the conversation list + unread badge;
 * notifications just invalidate the notifications list (its own hook owns
 * shape/derivation, e.g. unread count). Mount once.
 */
export function useChatRealtime() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    let conn: Awaited<ReturnType<typeof ensureChatStarted>> | null = null;
    let cancelled = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMsg = (raw: any) => {
      const msg: Message = {
        id: raw.id ?? raw.Id,
        content: raw.content ?? raw.Content,
        sentAt: raw.sentAt ?? raw.SentAt,
        senderId: raw.senderId ?? raw.SenderId,
        receiverId: raw.receiverId ?? raw.ReceiverId,
        attachmentType: raw.attachmentType ?? raw.AttachmentType ?? null,
        attachmentName: raw.attachmentName ?? raw.AttachmentName ?? null,
        isRead: false,
      };
      const partnerId = msg.senderId === user.id ? msg.receiverId : msg.senderId;

      qc.setQueryData<Message[]>(["thread", user.id, partnerId], (old = []) => {
        if (old.some((x) => x.id === msg.id)) return old;
        const filtered = old.filter(
          (x) => !(x.pending && x.senderId === msg.senderId && x.content === msg.content)
        );
        return [...filtered, msg];
      });
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      if (msg.receiverId === user.id) {
        qc.invalidateQueries({ queryKey: ["msg-unread", user.id] });
      }
    };

    const onNotification = () => {
      qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    };

    // Typing — clear after a grace period so a missed "stop" can't stick.
    const typingTimers = new Map<number, ReturnType<typeof setTimeout>>();
    const onTyping = (senderId: number, isTyping: boolean) => {
      const existing = typingTimers.get(senderId);
      if (existing) clearTimeout(existing);
      useChatStore.getState().setTyping(senderId, isTyping);
      if (isTyping) {
        typingTimers.set(
          senderId,
          setTimeout(() => useChatStore.getState().setTyping(senderId, false), 5000)
        );
      }
    };

    const onPresence = (userId: number, isOnline: boolean, lastSeenAt: string | null) => {
      useChatStore.getState().setPresence(userId, isOnline, lastSeenAt ?? null);
    };

    // The partner read my messages — flip my sent bubbles to "read" in place.
    const onRead = (readerId: number) => {
      qc.setQueryData<Message[]>(["thread", user.id, readerId], (old = []) =>
        old.map((m) => (m.senderId === user.id && !m.isRead ? { ...m, isRead: true } : m))
      );
    };

    ensureChatStarted()
      .then((c) => {
        if (cancelled) return;
        conn = c;
        c.on("ReceiveMessage", onMsg);
        c.on("ReceiveNotification", onNotification);
        c.on("ReceiveTyping", onTyping);
        c.on("PresenceChanged", onPresence);
        c.on("MessagesRead", onRead);
      })
      .catch(() => {
        /* auto-reconnect will keep retrying */
      });

    return () => {
      cancelled = true;
      typingTimers.forEach((t) => clearTimeout(t));
      conn?.off("ReceiveMessage", onMsg);
      conn?.off("ReceiveNotification", onNotification);
      conn?.off("ReceiveTyping", onTyping);
      conn?.off("PresenceChanged", onPresence);
      conn?.off("MessagesRead", onRead);
      useChatStore.getState().reset();
    };
  }, [user?.id, qc]);
}

/**
 * Subscribes to live presence for a set of users and seeds an initial snapshot.
 * Returns the live online / last-seen / typing maps from the shared store.
 */
export function usePresence(ids: number[]) {
  const online = useChatStore((s) => s.online);
  const lastSeen = useChatStore((s) => s.lastSeen);
  const typing = useChatStore((s) => s.typing);
  const key = Array.from(new Set(ids.filter((n) => Number.isFinite(n))))
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const list = key.split(",").map(Number);
    getPresence(list).then((snap) => {
      if (!cancelled) useChatStore.getState().mergePresence(snap);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { online, lastSeen, typing };
}
