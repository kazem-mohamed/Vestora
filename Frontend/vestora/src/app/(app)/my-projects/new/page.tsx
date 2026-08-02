"use client";

import Link from "next/link";
import { ProjectForm } from "@/components/projects/project-form";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";

export default function NewProjectPage() {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  if (user?.userType !== "Innovator") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-muted-foreground">{t("mine.onlyInnovators")}</p>
        <Link
          href="/projects"
          data-cursor="hover"
          className="link-underline mt-4 inline-block text-sm text-foreground"
        >
          {t("mine.browse")}
        </Link>
      </div>
    );
  }

  return <ProjectForm mode="create" />;
}
