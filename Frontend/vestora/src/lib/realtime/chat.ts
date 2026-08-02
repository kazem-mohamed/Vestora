import * as signalR from "@microsoft/signalr";
import { API_URL } from "@/lib/api/client";
import { authStore } from "@/lib/auth/store";

// One shared hub connection for the whole app. The hub is [Authorize]; SignalR
// forwards the JWT via the access_token query string (the backend is configured
// to read it), so we just hand it the in-memory access token.
let connection: signalR.HubConnection | null = null;

export function getChatConnection(): signalR.HubConnection {
  if (connection) return connection;
  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/chat`, {
      accessTokenFactory: () => authStore.getAccessToken() ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();
  return connection;
}

export async function ensureChatStarted(): Promise<signalR.HubConnection> {
  const conn = getChatConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
  }
  return conn;
}

export async function sendChatMessage(receiverId: number, content: string): Promise<void> {
  const conn = await ensureChatStarted();
  await conn.invoke("SendMessage", receiverId, content);
}

export interface PresenceSnapshot {
  userId: number;
  isOnline: boolean;
  lastSeenAt: string | null;
}

/** Best-effort typing relay — never throws (a dropped ping is harmless). */
export async function sendTyping(receiverId: number, isTyping: boolean): Promise<void> {
  try {
    const conn = await ensureChatStarted();
    await conn.invoke("Typing", receiverId, isTyping);
  } catch {
    /* transient — typing is best-effort */
  }
}

/** Point-in-time presence snapshot for the given users (empty on failure). */
export async function getPresence(userIds: number[]): Promise<PresenceSnapshot[]> {
  if (userIds.length === 0) return [];
  try {
    const conn = await ensureChatStarted();
    const raw = await conn.invoke<Array<Record<string, unknown>>>("GetPresence", userIds);
    return (raw ?? []).map((p) => ({
      userId: Number(p.userId ?? p.UserId),
      isOnline: Boolean(p.isOnline ?? p.IsOnline),
      lastSeenAt: (p.lastSeenAt ?? p.LastSeenAt ?? null) as string | null,
    }));
  } catch {
    return [];
  }
}

export async function stopChat(): Promise<void> {
  if (connection) {
    try {
      await connection.stop();
    } catch {
      /* ignore */
    }
    connection = null;
  }
}
