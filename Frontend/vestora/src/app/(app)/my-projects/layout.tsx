"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";
import { homeFor } from "@/lib/nav/role-nav";
import { useLocale } from "@/lib/i18n/locale";

/**
 * Creating and editing a venture belongs to founders.
 *
 * These routes previously sat under the plain authenticated shell, so an
 * investor or admin could open the full creation form, fill it in, and only
 * discover on submit that the server rejects them. The API was never at risk —
 * the wasted effort was.
 */
export default function MyProjectsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  if (user && user.userType !== "Innovator") {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-muted-foreground">{t("dash.onlyFounders")}</p>
        <Link
          href={homeFor(user)}
          data-cursor="hover"
          className="link-underline mt-4 inline-block text-sm text-foreground"
        >
          {t("nav.dashboard")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
