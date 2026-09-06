"use client";

import Link from "next/link";
import { DashboardMobileNav, DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";

/**
 * Control-room shell shared by every /dashboard/* page: role gate, the
 * desktop sidebar, and the mobile section pills. Pages render inside.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  // Founders only — everyone else is pointed at their own command centre.
  if (user && user.userType !== "Innovator") {
    const isAdmin = user.userType === "Admin";
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-muted-foreground">{t("dash.onlyFounders")}</p>
        <Link
          href={isAdmin ? "/admin" : "/invest"}
          data-cursor="hover"
          className="link-underline mt-4 inline-block text-sm text-foreground"
        >
          {isAdmin ? t("nav.admin") : t("inv.sidebar.label")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <DashboardMobileNav />
      <div className="mt-4 md:mt-0 md:grid md:grid-cols-[196px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-20">
            <DashboardSidebar />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
