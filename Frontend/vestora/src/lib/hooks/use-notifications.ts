"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api/notifications";
import { isOwed, laneOf, type Lane } from "@/lib/notifications/taxonomy";
import { useAuthStore } from "@/lib/auth/store";
import { useT } from "@/lib/i18n/locale";
import type { Notification } from "@/lib/types/api";

const EMPTY: Notification[] = [];

export function useNotifications() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const t = useT();
  const key = ["notifications", user?.id];

  const query = useQuery({
    queryKey: key,
    queryFn: () => notificationsApi.list(user!.id),
    enabled: !!user,
    // Live updates arrive via the "ReceiveNotification" SignalR push (see
    // useChatRealtime); this is just a safety net for a missed/dropped push.
    refetchInterval: 5 * 60_000,
  });

  // A fresh `[]` on every render would defeat the lane memo below, and this hook runs
  // in the header on every page — so the fallback is a stable reference.
  const notifications = query.data ?? EMPTY;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /**
   * Split into the three lanes once, here, so the bell and the page cannot drift
   * into disagreeing about what counts as urgent.
   */
  const lanes = useMemo(() => {
    const out: Record<Lane, Notification[]> = { needsYou: [], outcome: [], activity: [] };
    for (const n of notifications) out[laneOf(n)].push(n);
    // A settled request is still a notification, but it is no longer owed — it joins
    // the other things that merely happened rather than padding the urgent lane.
    const settled = out.needsYou.filter((n) => !isOwed(n));
    out.needsYou = out.needsYou.filter(isOwed);
    out.outcome = [...settled, ...out.outcome].sort(
      (a, b) => +new Date(b.dateCreated) - +new Date(a.dateCreated)
    );
    return out;
  }, [notifications]);

  const owedCount = lanes.needsYou.length;
  const clearableCount = notifications.filter(
    (n) => !n.isRead && laneOf(n) !== "needsYou"
  ).length;

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: (id: number) => notificationsApi.approve(id),
    onSuccess: () => {
      toast.success(t("notif.approved.toast"));
      invalidate();
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["my-projects"] });
      // Pending requests are one of the things the obligation band counts.
      qc.invalidateQueries({ queryKey: ["action-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (id: number) => notificationsApi.reject(id),
    onSuccess: () => {
      toast.success(t("notif.rejected.toast"));
      invalidate();
      qc.invalidateQueries({ queryKey: ["action-center"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Clear the record, never the obligations.
   *
   * This used to spare only pending support requests. But an unanswered deal question,
   * an unfilled document request and a rejected listing are equally owed, and for those
   * three the unread flag is the only thing keeping them in the needs-you lane — so one
   * tap on "mark all read" would have quietly emptied the one lane that matters.
   */
  const markAll = useMutation({
    mutationFn: async () => {
      const targets = notifications.filter((n) => !n.isRead && laneOf(n) !== "needsYou");
      await Promise.all(targets.map((n) => notificationsApi.markAsRead(n.notificationId)));
    },
    onSuccess: invalidate,
  });

  return {
    notifications,
    lanes,
    unreadCount,
    owedCount,
    clearableCount,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    markRead,
    approve,
    reject,
    markAll,
  };
}
