"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { useAuthStore } from "@/lib/auth/store";

function useIsAdmin() {
  return useAuthStore((s) => s.user?.userType === "Admin");
}

export function useAdminAnalytics() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => adminApi.analytics(),
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminUsers(search: string, userType: string, page: number) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin-users", search, userType, page],
    queryFn: () => adminApi.users({ search, userType, page, pageSize: 12 }),
    enabled: isAdmin,
    placeholderData: (prev) => prev,
  });
}

export function useAdminReports(status: string, page: number) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin-reports", status, page],
    queryFn: () => adminApi.reports({ status, page, pageSize: 12 }),
    enabled: isAdmin,
    placeholderData: (prev) => prev,
  });
}

/** Listings awaiting review — the queue that most needs an admin's attention. */
export function usePendingProjects() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin-pending-projects"],
    queryFn: () => adminApi.pendingProjects({ page: 1, pageSize: 20 }),
    enabled: isAdmin,
    staleTime: 20_000,
  });
}

/** Pending-review count for the sidebar badge. */
export function usePendingProjectsCount() {
  return usePendingProjects().data?.totalCount ?? 0;
}

/** Platform growth series (users / ventures over time). */
export function useAdminGrowth(months = 6) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin-growth", months],
    queryFn: () => adminApi.growth(months),
    enabled: isAdmin,
    staleTime: 60_000,
  });
}

/** Open-report count for the sidebar badge. */
export function useOpenReportsCount() {
  const isAdmin = useIsAdmin();
  const q = useQuery({
    queryKey: ["admin-reports", "Open", 1],
    queryFn: () => adminApi.reports({ status: "Open", page: 1, pageSize: 12 }),
    enabled: isAdmin,
    staleTime: 20_000,
  });
  return q.data?.openCount ?? 0;
}
