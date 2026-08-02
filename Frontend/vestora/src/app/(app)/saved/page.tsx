"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLoader } from "@/components/motion/brand-loader";
import { useAuthStore } from "@/lib/auth/store";

/**
 * Saved ventures no longer have a page of their own.
 *
 * This route and /invest/watchlist read the same bookmarks endpoint under the
 * same query key — one list behind two differently-styled surfaces. Saved is now
 * reviewed where it is acted on: investors get the watchlist inside their suite
 * (which also shows which ventures they already have a live request on), and
 * everyone else gets browse narrowed to their saves.
 *
 * Client-side because the destination depends on the role, and the session lives
 * in memory rather than a cookie the server could read.
 */
export default function SavedRedirect() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === "loading" || status === "idle") return;
    router.replace(
      user?.userType === "Investor" ? "/invest/watchlist" : "/projects?saved=1"
    );
  }, [router, status, user]);

  return <BrandLoader />;
}
