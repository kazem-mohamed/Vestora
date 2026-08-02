"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Handshake, MessagesSquare, ScrollText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { engagementApi } from "@/lib/api/engagement";
import { avatarUrl } from "@/lib/api/users";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Endorsement } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The four things a backer is in a position to say about a founder.
 *
 * Discrete and specific, replacing a 1–5 star rating that read like a review of a
 * consumer product. A number out of five told nobody anything actionable and invited
 * exactly the manufactured social proof this platform should not carry; "4 of 5
 * backers say they'd back this founder again" is a claim someone can check.
 */
const TRAITS = [
  { key: "communicative", icon: MessagesSquare, labelKey: "end.trait.communicative" },
  { key: "transparent", icon: ScrollText, labelKey: "end.trait.transparent" },
  { key: "deliveredOnPlan", icon: Check, labelKey: "end.trait.delivered" },
  { key: "wouldBackAgain", icon: Handshake, labelKey: "end.trait.again" },
] as const;

type TraitKey = (typeof TRAITS)[number]["key"];

export function ProjectReviews({ projectId }: { projectId: number }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["reviews", projectId],
    queryFn: () => engagementApi.reviews(projectId),
  });

  const [picked, setPicked] = useState<Record<TraitKey, boolean>>({
    communicative: false,
    transparent: false,
    deliveredOnPlan: false,
    wouldBackAgain: false,
  });
  const [content, setContent] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      engagementApi.submitReview(projectId, { ...picked, content: content.trim() || undefined }),
    onSuccess: () => {
      toast.success(t("end.saved"));
      setContent("");
      qc.invalidateQueries({ queryKey: ["reviews", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) return null;

  const anyPicked = Object.values(picked).some(Boolean);
  const canSubmit = (anyPicked || content.trim().length > 0) && !submit.isPending;

  const tallies: { key: TraitKey; count: number }[] = [
    { key: "communicative", count: data.communicativeCount },
    { key: "transparent", count: data.transparentCount },
    { key: "deliveredOnPlan", count: data.deliveredOnPlanCount },
    { key: "wouldBackAgain", count: data.wouldBackAgainCount },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className={cn("text-xs text-primary", rtl ? "" : "uppercase tracking-[0.35em]")}>
          {t("end.section")}
        </h2>
        {data.count > 0 && (
          <span className="font-numeric text-xs text-muted-foreground">
            {t("end.count").replace("{n}", String(data.count))}
          </span>
        )}
      </div>

      {/* ---- Tallies. Counted, never averaged: a fraction of named backers is
           checkable, a score out of five is not. ---- */}
      {data.count > 0 && (
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl bg-border/40 sm:grid-cols-2 lg:grid-cols-4">
          {tallies.map(({ key, count }, i) => {
            const trait = TRAITS.find((x) => x.key === key)!;
            const Icon = trait.icon;
            const strong = count > 0 && count >= Math.ceil(data.count / 2);
            return (
              <motion.div
                key={key}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }}
                className="bg-card/50 p-4"
              >
                <Icon
                  className={cn("size-4", strong ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={1.8}
                />
                <p className="font-numeric mt-3 text-lg leading-none text-foreground">
                  {count}
                  <span className="text-xs text-muted-foreground"> / {data.count}</span>
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  {t(trait.labelKey)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---- Write / edit ---- */}
      {(data.canEndorse || data.hasEndorsed) && (
        <div className="mt-6 rounded-2xl border border-border/70 bg-card/50 p-5">
          <p className="text-sm font-medium">
            {data.hasEndorsed ? t("end.editYours") : t("end.writeTitle")}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {t("end.writeHint")}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {TRAITS.map((trait) => {
              const on = picked[trait.key];
              const Icon = trait.icon;
              return (
                <button
                  key={trait.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  data-cursor="hover"
                  onClick={() => setPicked((p) => ({ ...p, [trait.key]: !p[trait.key] }))}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs outline-none",
                    "transition-all duration-300 focus-visible:ring-3 focus-visible:ring-ring/25",
                    on
                      ? "border-primary/60 bg-primary/[0.08] text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={1.9} />
                  {t(trait.labelKey)}
                </button>
              );
            })}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 1500))}
            rows={3}
            placeholder={t("end.placeholder")}
            aria-label={t("end.placeholder")}
            className={cn(
              "mt-4 w-full resize-none rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none",
              "transition-colors duration-300 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
            )}
          />

          <button
            type="button"
            data-cursor="hover"
            disabled={!canSubmit}
            onClick={() => submit.mutate()}
            className={cn(
              "mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-6 text-sm outline-none",
              "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
              "focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-40"
            )}
          >
            <Sparkles className="size-3.5" strokeWidth={1.9} />
            {submit.isPending ? t("end.saving") : t("end.submit")}
          </button>
        </div>
      )}

      {/* ---- The endorsements themselves ---- */}
      <div className="mt-8">
        {data.count === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">{t("end.empty")}</p>
        ) : (
          <div className="space-y-5">
            {data.items.map((e, i) => (
              <EndorsementRow key={e.id} e={e} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EndorsementRow({ e, index }: { e: Endorsement; index: number }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const [failed, setFailed] = useState(false);

  const said = TRAITS.filter((tr) => e[tr.key]);

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: Math.min(index, 4) * 0.05, ease: EASE }}
      className="flex gap-4"
    >
      <Link
        href={`/u/${e.investorId}`}
        data-cursor="hover"
        aria-label={e.investorName}
        className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
      >
        {e.hasAvatar && !failed ? (
          <img
            src={avatarUrl(e.investorId)}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[11px] text-primary" style={{ fontFamily: "var(--font-heading)" }}>
            {e.investorName.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1 border-b border-border/50 pb-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            href={`/u/${e.investorId}`}
            data-cursor="hover"
            className="text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            {e.investorName}
          </Link>
          <span className="text-[11px] text-muted-foreground">{t("end.backer")}</span>
        </div>

        {/* Rows written under the old star system carry no traits. Saying so is more
            honest than rendering four unticked boxes as though they declined each one. */}
        {e.isLegacy ? (
          <p className="mt-2 text-xs italic text-muted-foreground/70">{t("end.legacy")}</p>
        ) : (
          said.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {said.map((tr) => (
                <span
                  key={tr.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.05] px-2.5 py-1 text-[11px] text-primary/90"
                >
                  <tr.icon className="size-2.5" strokeWidth={2.2} />
                  {t(tr.labelKey)}
                </span>
              ))}
            </div>
          )
        )}

        {e.content && (
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
            {e.content}
          </p>
        )}
      </div>
    </motion.article>
  );
}
