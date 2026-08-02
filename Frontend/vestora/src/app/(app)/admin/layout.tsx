"use client";

import Link from "next/link";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  // Admins only.
  if (user && user.userType !== "Admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-muted-foreground">{t("admin.onlyAdmins")}</p>
        <Link href="/" data-cursor="hover" className="link-underline mt-4 inline-block text-sm text-foreground">
          {t("proj.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AdminMobileNav />
      <div className="mt-4 lg:mt-0 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <AdminSidebar />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
