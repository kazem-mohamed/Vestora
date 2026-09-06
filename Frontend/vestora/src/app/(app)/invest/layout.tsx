"use client";

import Link from "next/link";
import { InvestMobileNav, InvestSidebar } from "@/components/invest/invest-sidebar";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";

/**
 * Command-centre shell shared by every /invest/* page: role gate, the desktop
 * sidebar and the mobile section pills. Mirrors the founder shell so both roles
 * feel like one product, while the sections themselves differ by role.
 */
export default function InvestLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  // Investors only — founders get pointed back to their control room.
  if (user && user.userType !== "Investor") {
    const isFounder = user.userType === "Innovator";
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-muted-foreground">{t("inv.onlyInvestors")}</p>
        <Link
          href={isFounder ? "/dashboard" : "/projects"}
          data-cursor="hover"
          className="link-underline mt-4 inline-block text-sm text-foreground"
        >
          {isFounder ? t("nav.dashboard") : t("nav.browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <InvestMobileNav />
      <div className="mt-4 md:mt-0 md:grid md:grid-cols-[196px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden md:block">
          <div className="sticky top-20">
            <InvestSidebar />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
