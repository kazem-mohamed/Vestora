import { api } from "@/lib/api/client";
import type { ApiMessage, Notification, PagedResult } from "@/lib/types/api";

export const notificationsApi = {
  // Backend paginates (unbounded queries no longer possible for users with
  // hundreds of notifications); unwrap to a bare list here so existing
  // consumers (bell dropdown, full feed) don't need to change.
  list: async (userId: number) => {
    const r = await api.get<PagedResult<Notification>>(
      `/api/notification/${userId}/notifications?page=1&pageSize=100`
    );
    return r.items;
  },

  markAsRead: (notificationId: number) =>
    api.post<ApiMessage>(`/api/notification/notifications/${notificationId}/mark-as-read`, {}),

  // Innovator acts on a "ProjectSupported" request.
  approve: (notificationId: number) =>
    api.post<ApiMessage>(`/api/notification/${notificationId}/approve-support`, {}),

  reject: (notificationId: number) =>
    api.post<ApiMessage>(`/api/notification/${notificationId}/reject-support`, {}),
};
