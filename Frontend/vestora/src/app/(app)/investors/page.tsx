"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { CapitalRegister } from "@/components/capital/capital-register";

/**
 * Capital discovery — the founder's side of the marketplace.
 *
 * Founder-only, matching the server: an investor browsing other investors is not a
 * journey this product has, and opening it wider would turn a working directory into
 * a scrapeable list of funders. Admins have their own user tooling.
 *
 * The route lives inside (app) so it inherits the authenticated shell, and the
 * Suspense boundary is here because the register reads its whole state from the URL.
 */
export default function InvestorsPage() {
  return (
    <RequireAuth roles={["Innovator"]}>
      <div className="mx-auto w-full max-w-7xl px-6 pb-24 sm:px-10">
        <Suspense fallback={<RegisterFallback />}>
          <CapitalRegister />
        </Suspense>
      </div>
    </RequireAuth>
  );
}

function RegisterFallback() {
  return (
    <div className="pt-16 sm:pt-20">
      <div className="h-3 w-28 rounded-full bg-foreground/10" />
      <div className="mt-6 h-12 w-2/3 max-w-xl rounded-lg bg-foreground/10" />
      <div className="mt-5 h-4 w-1/2 max-w-md rounded bg-foreground/[0.07]" />
      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-[22rem] rounded-[1.4rem] border border-border/50"
          />
        ))}
      </div>
    </div>
  );
}
