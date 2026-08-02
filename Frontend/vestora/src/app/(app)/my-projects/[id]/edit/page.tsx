"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProjectForm } from "@/components/projects/project-form";
import { BackersList } from "@/components/projects/backers-list";
import { projectsApi } from "@/lib/api/projects";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";

function Gate({ message }: { message: string }) {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-muted-foreground">{message}</p>
      <Link
        href="/my-projects"
        data-cursor="hover"
        className="link-underline mt-4 inline-block text-sm text-foreground"
      >
        {t("mine.title")}
      </Link>
    </div>
  );
}

export default function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = Number(id);
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.details(projectId),
    enabled: Number.isFinite(projectId),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  if (user?.userType !== "Innovator") return <Gate message={t("mine.onlyInnovators")} />;

  if (error instanceof ApiError && error.status === 404) {
    return <Gate message={t("proj.detail.notFound.title")} />;
  }

  if (isLoading || !project) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-16">
        <div className="h-10 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-40 animate-pulse rounded bg-secondary" />
      </div>
    );
  }

  if (project.ownerId !== user.id) return <Gate message={t("form.forbidden")} />;

  return (
    <>
      <ProjectForm mode="edit" project={project} />
      <div className="mx-auto max-w-6xl px-6 sm:py-4">
        <BackersList projectId={project.id} />
      </div>
    </>
  );
}
