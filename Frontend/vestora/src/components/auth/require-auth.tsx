"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandLoader } from "@/components/motion/brand-loader";
import { useAuthStore } from "@/lib/auth/store";
import type { UserType } from "@/lib/types/api";

/**
 * Client-side route guard. Because tokens live in memory/localStorage (not
 * cookies), auth gating happens on the client, not in a server proxy.
 */
export function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserType[];
}) {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  const roleAllowed = !roles || (user ? roles.includes(user.userType) : false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && !roleAllowed) {
      router.replace("/no-access");
    }
  }, [status, roleAllowed, router]);

  if (status === "idle" || status === "loading") return <BrandLoader />;
  if (status === "unauthenticated") return null;
  if (!roleAllowed) return null;

  return <>{children}</>;
}
