"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PillButton } from "@/components/ui/pill-button";
import { SectionLabel } from "@/components/ui/section-label";
import { ImageDropzone, type StagedFile } from "@/components/projects/image-dropzone";
import { projectImageUrl, projectsApi, type ProjectInput } from "@/lib/api/projects";
import { PROJECT_CATEGORIES, categoryLabelKey } from "@/lib/config/categories";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types/api";

function useSchema() {
  const { t } = useLocale();
  return useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("valid.min")).max(100, t("valid.max100")),
        description: z.string().trim().min(1, t("valid.min")),
        topic: z.string().trim().max(100, t("valid.max100")),
        category: z.string().trim().max(100, t("valid.max100")),
        location: z.string().trim().max(150, t("valid.max150")),
        videoUrl: z.union([z.literal(""), z.string().trim().url(t("valid.url"))]),
        investmentNeeded: z
          .string()
          .trim()
          .min(1, t("valid.min"))
          .refine((v) => Number(v) > 0, t("valid.positive")),
        stage: z.string().trim(),
        valuation: z.union([
          z.literal(""),
          z.string().trim().refine((v) => Number(v) > 0, t("valid.positive")),
        ]),
        equityOffered: z.union([
          z.literal(""),
          z.string().trim().refine((v) => Number(v) > 0 && Number(v) <= 100, t("valid.percent")),
        ]),
        useOfFunds: z.string().trim().max(1000, t("valid.max1000")),
      }),
    [t]
  );
}

type FormValues = {
  name: string;
  description: string;
  topic: string;
  category: string;
  location: string;
  videoUrl: string;
  investmentNeeded: string;
  stage: string;
  valuation: string;
  equityOffered: string;
  useOfFunds: string;
};

const STAGES = ["Idea", "Pre-seed", "Seed", "Growth"] as const;

function toProjectInput(values: FormValues): ProjectInput {
  return {
    name: values.name,
    description: values.description,
    topic: values.topic || null,
    category: values.category || null,
    location: values.location || null,
    videoUrl: values.videoUrl || null,
    investmentNeeded: Number(values.investmentNeeded),
    stage: values.stage || null,
    valuation: values.valuation ? Number(values.valuation) : null,
    equityOffered: values.equityOffered ? Number(values.equityOffered) : null,
    useOfFunds: values.useOfFunds || null,
  };
}

const inputCls =
  "h-12 w-full rounded-xl border border-input bg-card/60 px-4 text-sm outline-none backdrop-blur-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/20";

function compactUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Live card preview that mirrors how the venture will read once published. */
function PreviewCard({
  values,
  imageUrl,
  raised,
}: {
  values: FormValues;
  imageUrl: string | null;
  raised: number;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const goal = Number(values.investmentNeeded) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const name = values.name?.trim() || t("form.preview.placeholder");

  return (
    <div className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[1.4rem] bg-secondary ring-1 ring-border">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 120% at 15% 0%, color-mix(in oklab, var(--primary) 26%, transparent), transparent 55%), radial-gradient(120% 120% at 100% 100%, color-mix(in oklab, var(--bronze) 26%, transparent), transparent 55%)",
          }}
        >
          <span
            aria-hidden
            className="absolute bottom-2 left-4 select-none text-[9rem] leading-none text-foreground/[0.07]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {(values.name?.trim()?.charAt(0) || "V").toUpperCase()}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908] via-[#0a0908]/30 to-transparent" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 text-[#f0eae0]">
        {values.category?.trim() ? (
          <span className="rounded-full bg-black/30 px-3 py-1 text-[11px] backdrop-blur-sm">
            {t(categoryLabelKey(values.category))}
          </span>
        ) : (
          <span />
        )}
        {values.location?.trim() && (
          <span className="text-[11px] text-[#d8cdb8]">{values.location}</span>
        )}
      </div>

      <div className="relative z-10 p-5 text-[#f0eae0]">
        <p className={cn("text-[11px] text-[#d8cdb8]", rtl ? "" : "uppercase tracking-[0.18em]")}>
          {t("proj.card.needs")}
        </p>
        <h3
          className="mt-1.5 line-clamp-2 text-2xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {name}
        </h3>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="font-numeric text-base leading-tight">
            {compactUsd(raised)}
            <span className="text-[#a89c89]"> {t("proj.card.of")} {compactUsd(goal)}</span>
          </p>
          <p className="font-numeric text-sm text-[#c7a968]">{pct}%</p>
        </div>
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-[#c7a968] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ProjectForm({
  mode,
  project,
}: {
  mode: "create" | "edit";
  project?: Project;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const schema = useSchema();
  const qc = useQueryClient();

  const [existingIds, setExistingIds] = useState<number[]>(project?.imageIds ?? []);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [phase, setPhase] = useState<"idle" | "saving" | "uploading">("idle");

  const filtersQuery = useQuery({
    queryKey: ["project-filters"],
    queryFn: () => projectsApi.filters(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      topic: project?.topic ?? "",
      category: project?.category ?? "",
      location: project?.location ?? "",
      videoUrl: project?.videoUrl ?? "",
      investmentNeeded: project?.investmentNeeded != null ? String(project.investmentNeeded) : "",
      stage: project?.stage ?? "",
      valuation: project?.valuation != null ? String(project.valuation) : "",
      equityOffered: project?.equityOffered != null ? String(project.equityOffered) : "",
      useOfFunds: project?.useOfFunds ?? "",
    },
  });

  const live = watch();
  const previewImage =
    staged[0]?.url ?? (existingIds[0] != null ? projectImageUrl(existingIds[0]) : null);

  function addFiles(files: File[]) {
    setStaged((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const gone = prev.find((s) => s.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((s) => s.id !== id);
    });
  }

  async function removeExisting(imageId: number) {
    const prev = existingIds;
    setExistingIds((ids) => ids.filter((i) => i !== imageId));
    try {
      await projectsApi.deleteImage(imageId);
    } catch (e) {
      setExistingIds(prev);
      toast.error((e as Error).message);
    }
  }

  async function onSubmit(values: FormValues) {
    const input = toProjectInput(values);

    try {
      setPhase("saving");
      let id = project?.id;
      if (mode === "create") {
        const res = await projectsApi.create(input);
        id = res.projectId;
      } else {
        await projectsApi.update(project!.id, input);
      }

      if (staged.length > 0 && id != null) {
        setPhase("uploading");
        for (const s of staged) {
          await projectsApi.uploadImage(id, s.file);
        }
      }

      if (id != null) qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["my-projects"] });
      qc.invalidateQueries({ queryKey: ["projects"] });

      toast.success(mode === "create" ? t("form.created") : t("form.saved"));
      router.push(`/projects/${id}`);
    } catch (e) {
      setPhase("idle");
      toast.error((e as Error).message);
    }
  }

  const busy = phase !== "idle";
  const submitLabel =
    phase === "uploading"
      ? t("form.uploading")
      : phase === "saving"
        ? t("form.submitting")
        : mode === "create"
          ? t("form.submit.create")
          : t("form.submit.save");

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <header>
        <p className="text-xs text-primary uppercase tracking-[0.3em] rtl:normal-case rtl:tracking-normal">
          {mode === "create" ? t("form.eyebrow.new") : t("form.eyebrow.edit")}
        </p>
        <h1
          className="mt-4 text-4xl font-bold leading-[1.03] sm:text-6xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {mode === "create" ? t("form.new.title") : t("form.edit.title")}
        </h1>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
        {/* Live preview — on top on mobile, sticky on the side on desktop */}
        <aside className="order-first lg:order-last">
          <div className="lg:sticky lg:top-24">
            <p className="mb-4 hidden text-xs text-muted-foreground uppercase tracking-[0.25em] lg:block">
              {t("form.preview.label")}
            </p>
            <PreviewCard
              values={live}
              imageUrl={previewImage}
              raised={project?.raisedAmount ?? 0}
            />
          </div>
        </aside>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-14">
          <section className="space-y-6">
            <SectionLabel index={1}>{t("form.section.basics")}</SectionLabel>
            <Field label={t("form.name")} htmlFor="name" error={errors.name?.message}>
              <input id="name" className={inputCls} placeholder={t("form.name.ph")} {...register("name")} />
            </Field>
            <Field label={t("form.topic")} htmlFor="topic" error={errors.topic?.message}>
              <input id="topic" className={inputCls} placeholder={t("form.topic.ph")} {...register("topic")} />
            </Field>
            <Field label={t("form.description")} htmlFor="description" error={errors.description?.message}>
              <textarea
                id="description"
                rows={6}
                className={inputCls.replace("h-12", "min-h-36 py-3 resize-y")}
                placeholder={t("form.description.ph")}
                {...register("description")}
              />
            </Field>
          </section>

          <section className="space-y-6">
            <SectionLabel index={2}>{t("form.section.classification")}</SectionLabel>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* A closed list, not a Combobox: Category used to be free text, which
                  let three founders type the same business three different ways
                  ("Fashion", "Apparel", "Clothing") and rendered as raw English on
                  an Arabic screen regardless. One list, translated, replaces both
                  the old Category and Industry fields. */}
              <Field label={t("form.category")} error={errors.category?.message}>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="category" className="h-12 rounded-xl bg-card/60 px-4">
                        <SelectValue placeholder={t("form.category.ph")} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_CATEGORIES.map((key) => (
                          <SelectItem key={key} value={key}>
                            {t(categoryLabelKey(key))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label={t("form.location")} error={errors.location?.message}>
                <Controller
                  control={control}
                  name="location"
                  render={({ field }) => (
                    <Combobox
                      value={field.value}
                      onChange={field.onChange}
                      options={filtersQuery.data?.locations ?? []}
                      placeholder={t("form.combo.ph")}
                    />
                  )}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-6">
            <SectionLabel index={3}>{t("form.section.funding")}</SectionLabel>
            <Field label={t("form.investment")} htmlFor="investmentNeeded" error={errors.investmentNeeded?.message}>
              <input
                id="investmentNeeded"
                type="number"
                min="0"
                step="any"
                inputMode="numeric"
                className={`${inputCls} font-numeric`}
                placeholder="50000"
                {...register("investmentNeeded")}
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label={t("form.stage")} htmlFor="stage" error={errors.stage?.message}>
                <Controller
                  control={control}
                  name="stage"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="stage" className="h-12 rounded-xl bg-card/60 px-4">
                        <SelectValue placeholder={t("form.combo.ph")} />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label={t("form.valuation")} htmlFor="valuation" error={errors.valuation?.message}>
                <input
                  id="valuation"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="numeric"
                  className={`${inputCls} font-numeric`}
                  placeholder="1000000"
                  {...register("valuation")}
                />
              </Field>
            </div>
            <Field label={t("form.equity")} htmlFor="equityOffered" error={errors.equityOffered?.message}>
              <input
                id="equityOffered"
                type="number"
                min="0"
                max="100"
                step="any"
                inputMode="numeric"
                className={`${inputCls} font-numeric`}
                placeholder="5"
                {...register("equityOffered")}
              />
            </Field>
            <Field label={t("form.useOfFunds")} htmlFor="useOfFunds" error={errors.useOfFunds?.message}>
              <textarea
                id="useOfFunds"
                rows={4}
                className={inputCls.replace("h-12", "min-h-28 py-3 resize-y")}
                placeholder={t("form.useOfFunds.ph")}
                {...register("useOfFunds")}
              />
            </Field>
          </section>

          <section className="space-y-6">
            <SectionLabel index={4}>{t("form.section.media")}</SectionLabel>
            <Field label={t("form.video")} htmlFor="videoUrl" error={errors.videoUrl?.message}>
              <input id="videoUrl" className={inputCls} placeholder={t("form.video.ph")} {...register("videoUrl")} />
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("form.images")}</p>
              <ImageDropzone
                existingIds={existingIds}
                onRemoveExisting={removeExisting}
                staged={staged}
                onAddFiles={addFiles}
                onRemoveStaged={removeStaged}
              />
            </div>
          </section>

          <div className="flex items-center gap-5 border-t border-border/60 pt-8">
            <PillButton type="submit" size="lg" disabled={busy}>
              {submitLabel}
            </PillButton>
            <Link
              href="/dashboard/ventures"
              data-cursor="hover"
              className="link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
