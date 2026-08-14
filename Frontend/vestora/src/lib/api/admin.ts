import { api } from "@/lib/api/client";
import type {
  AdminAlerts,
  AdminAnalytics,
  AdminAuditFilters,
  AdminAuditLogResponse,
  AdminGrowth,
  AdminInsights,
  AdminReportsResponse,
  AdminSearchResults,
  AdminSecurity,
  AdminUser,
  AdminUserOverview,
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

  userOverview: (id: number) => api.get<AdminUserOverview>(`/api/admin/users/${id}/overview`),

  alerts: () => api.get<AdminAlerts>("/api/admin/alerts"),

  insights: () => api.get<AdminInsights>("/api/admin/insights"),

  search: (q: string, signal?: AbortSignal) =>
    api.get<AdminSearchResults>(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal }),

  // A reason is required by the API on every destructive action — the person on the
  // other end will ask why, and the audit row is where that answer has to live.
  deleteUser: (id: number, reason: string) =>
    api.del<{ message: string }>(`/api/admin/users/${id}`, { body: { reason } }),

  suspendUser: (id: number, reason: string) =>
    api.post<{ message: string }>(`/api/admin/users/${id}/suspend`, { reason }),

  restoreUser: (id: number) =>
    api.post<{ message: string }>(`/api/admin/users/${id}/restore`, {}),

  auditLog: (opts: AdminAuditFilters) => {
    const q = new URLSearchParams();
    q.set("page", String(opts.page ?? 1));
    q.set("pageSize", String(opts.pageSize ?? 30));
    if (opts.adminId != null) q.set("adminId", String(opts.adminId));
    if (opts.action) q.set("action", opts.action);
    if (opts.targetType) q.set("targetType", opts.targetType);
    if (opts.from) q.set("from", opts.from);
    if (opts.to) q.set("to", opts.to);
    return api.get<AdminAuditLogResponse>(`/api/admin/audit-log?${q.toString()}`);
  },

  security: (days = 14) => api.get<AdminSecurity>(`/api/admin/security?days=${days}`),

  growth: (months = 6) => api.get<AdminGrowth>(`/api/admin/growth?months=${months}`),

  deleteProject: (id: number, reason: string) =>
    api.del<{ message: string }>(`/api/admin/projects/${id}`, { body: { reason } }),

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

  rejectProject: (id: number, reason: string) =>
    api.post<{ message: string }>(`/api/admin/projects/${id}/reject`, { reason }),
};
