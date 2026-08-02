"use client";

import { useChatRealtime } from "@/lib/hooks/use-chat";

/** Mounts the shared SignalR connection + cache wiring once, app-wide. */
export function ChatRealtime() {
  useChatRealtime();
  return null;
}
