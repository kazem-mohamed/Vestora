import { api } from "@/lib/api/client";
import type {
  AdminAnalytics,
  AdminAuditLogResponse,
  AdminGrowth,
  AdminReportsResponse,
  AdminSecurity,
  AdminUser,
  PagedResult,
  PendingProject,
} from "@/lib/types/api";

export const adminApi = {
  analytics: () => api.get<AdminAnalytics>("/api/admin/analytics"),

  users: (opts: { search?: string; userType?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (opts.search) q.set("search", opts.search);
    if (opts.userType) q.set("userType", opts.userType);
    q.set("page", String(opts.page ?? 1));
    q.set("pageSize", String(opts.pageSize ?? 20));
    return api.get<PagedResult<AdminUser>>(`/api/admin/users?${q.toString()}`);
  },

  deleteUser: (id: number) => api.del<{ message: string }>(`/api/admin/users/${id}`),

  suspendUser: (id: number, reason?: string) =>
    api.post<{ message: string }>(`/api/admin/users/${id}/suspend`, { reason: reason ?? null }),

  restoreUser: (id: number) =>
    api.post<{ message: string }>(`/api/admin/users/${id}/restore`, {}),

  auditLog: (opts: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    q.set("page", String(opts.page ?? 1));
    q.set("pageSize", String(opts.pageSize ?? 30));
    return api.get<AdminAuditLogResponse>(`/api/admin/audit-log?${q.toString()}`);
  },

  security: (days = 14) => api.get<AdminSecurity>(`/api/admin/security?days=${days}`),

  growth: (months = 6) => api.get<AdminGrowth>(`/api/admin/growth?months=${months}`),

  deleteProject: (id: number) => api.del<{ message: string }>(`/api/admin/projects/${id}`),

  reports: (opts: { status?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (opts.status) q.set("status", opts.status);
    q.set("page", String(opts.page ?? 1));
    q.set("pageSize", String(opts.pageSize ?? 20));
    return api.get<AdminReportsResponse>(`/api/admin/reports?${q.toString()}`);
  },

  resolveReport: (id: number) => api.post<{ message: string }>(`/api/admin/reports/${id}/resolve`, {}),

  dismissReport: (id: number) => api.post<{ message: string }>(`/api/admin/reports/${id}/dismiss`, {}),

  createAdmin: (dto: { userName: string; email: string; password: string }) =>
    api.post<{ message: string; userId: number }>("/api/admin/admins", dto),

  // Project moderation queue (listings awaiting review before going public).
  pendingProjects: (opts: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    q.set("page", String(opts.page ?? 1));
    q.set("pageSize", String(opts.pageSize ?? 20));
    return api.get<{ items: PendingProject[]; totalCount: number; page: number; pageSize: number }>(
      `/api/admin/projects/pending?${q.toString()}`
    );
  },

  approveProject: (id: number) => api.post<{ message: string }>(`/api/admin/projects/${id}/approve`, {}),

  rejectProject: (id: number, reason?: string) =>
    api.post<{ message: string }>(`/api/admin/projects/${id}/reject`, { reason: reason ?? null }),
};
