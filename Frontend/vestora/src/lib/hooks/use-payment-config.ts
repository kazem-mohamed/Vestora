"use client";

import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/payments";
import type { PaymentConfig } from "@/lib/types/api";

/**
 * The environment's own description of itself: which provider is wired up, what
 * the platform fee is, and whether this is a sandbox.
 *
 * Read rather than hardcoded, because a fee rate baked into the interface is a
 * fee rate that will one day disagree with the one the server charged. Cached
 * hard — it changes only when the deployment does.
 */
export function usePaymentConfig() {
  return useQuery<PaymentConfig>({
    queryKey: ["payment-config"],
    queryFn: () => paymentsApi.config(),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/** The fee rate in basis points, with a safe default before the config lands. */
export function useFeeRateBps(): number {
  return usePaymentConfig().data?.feeRateBps ?? 500;
}
