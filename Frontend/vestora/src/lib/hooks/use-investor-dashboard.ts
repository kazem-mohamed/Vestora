"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { useAuthStore } from "@/lib/auth/store";

/** Aggregated investor command-centre payload. Investor role only. */
export function useInvestorDashboard() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ["investor-dashboard", user?.id],
    queryFn: () => dashboardApi.investor(),
    enabled: !!user && user.userType === "Investor",
    staleTime: 60_000,
  });
}
