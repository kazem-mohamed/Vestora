"use client";

import { homeFor, homeLabelKeyFor } from "@/lib/nav/role-nav";
import { useAuthStore } from "@/lib/auth/store";

/**
 * The landing page's primary call to action.
 *
 * Its marketing copy ("Request access") is written for a prospect, but the page
 * is also the front door for people who already have an account — and every one
 * of its CTAs used to invite them to sign up again. Signed in, the same button
 * becomes the way back into their own part of the product.
 */
export function useLandingCta(): { href: string; labelKey: string } {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  if (status === "authenticated" && user) {
    return { href: homeFor(user), labelKey: homeLabelKeyFor(user) };
  }
  return { href: "/register", labelKey: "home.cta.request" };
}
