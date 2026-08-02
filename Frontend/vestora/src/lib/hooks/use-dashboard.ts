"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { useAuthStore } from "@/lib/auth/store";

/** The founder control-room aggregate (Innovator only). */
export function useFounderDashboard() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["founder-dashboard", user?.id],
    queryFn: () => dashboardApi.founder(),
    enabled: !!user && user.userType === "Innovator",
    staleTime: 30_000,
  });
}
