"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { DepthLayer, DepthScene } from "@/components/motion/depth-scene";
import { PillButton } from "@/components/ui/pill-button";
import { SupportModal } from "@/components/projects/support-modal";
import { FounderLink } from "@/components/projects/founder-link";
import { MessageLauncher } from "@/components/messages/message-launcher";
import {
  FundingDial,
  FundingStatePill,
  SandboxBadge,
} from "@/components/funding/funding-primitives";
import { investorApi } from "@/lib/api/investor";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import type { MySupport, Project } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function usd(value: number, max = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: max,
  }).format(value);
}

/** Short form for the tight metric cells: $1,200,000 → $1.2M. */
function compactUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function Metric({
  value,
  label,
  bronze,
  delay,
}: {
  value: React.ReactNode;
  label: string;
  bronze?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="overflow-hidden rounded-xl border border-border/60 bg-background/40 px-3 py-3 transition-colors duration-300 hover:border-primary/40"
    >
      <p className={`font-numeric truncate text-lg leading-none ${bronze ? "text-bronze" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p>
    </motion.div>
  );
}

/** One label/value row in the panel's detail list — used for deal terms. */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-numeric text-foreground">{value}</span>
    </div>
  );
}

/**
 * Where this investor stands with this venture.
 *
 * Four possible readings now instead of two, and the one that matters most —
 * money is owed — is the only one that carries an action. It links into the deal
 * room rather than opening a checkout here: the payment belongs to the
 * relationship, and the room is where the agreed amount and its history live.
 */
function SupportStatusBox({ mine }: { mine: MySupport }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const state = mine.fundingState;

  const due = state === "PaymentDue";
  const funded = state === "Funded";

  const amount = funded
    ? (mine.fundedAmount ?? mine.amount)
    : due
      ? (mine.agreedAmount ?? mine.amount)
      : mine.amount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`rounded-xl border px-4 py-4 text-center ${
        funded
          ? "border-primary/55 bg-primary/[0.07]"
          : due
            ? "border-primary/45 bg-primary/[0.05]"
            : state === "Committed"
              ? "border-primary/40 bg-primary/[0.04]"
              : "border-bronze/40 bg-bronze/[0.05]"
      }`}
    >
      <div className="flex items-center justify-center">
        <FundingStatePill state={state} pulse />
      </div>

      <p className="font-numeric mt-3 text-2xl">{usd(amount)}</p>

      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {funded
          ? t("support.status.yourSupport")
          : due
            ? t("fund.due.title")
            : state === "Committed"
              ? t("support.status.yourSupport")
              : t("support.status.pendingHint")}
      </p>

      {due && mine.investmentId != null && (
        <Link
          href={`/deals/${mine.investmentId}`}
          data-cursor="hover"
          className="gold-cta group mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("fund.due.cta")}
          <ArrowRight
            className={`size-4 transition-transform duration-300 group-hover:translate-x-0.5 ${
              rtl ? "rotate-180 group-hover:-translate-x-0.5" : ""
            }`}
            strokeWidth={2}
          />
        </Link>
      )}

      {funded && <SandboxBadge variant="line" className="mt-3 justify-center" />}
    </motion.div>
  );
}

export function SupportPanel({
  project,
  pct,
  funded,
}: {
  project: Project;
  pct: number;
  funded: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  // These figures are the page's headline facts, so they animate on mount rather
  // than on scroll. The panel is sticky inside a Lenis-driven page, where the
  // IntersectionObserver behind useInView never fired — leaving a venture with
  // $260K committed rendering a permanent "$0 · 0% · 0 investors".

  const owner = user?.id === project.ownerId;
  const isInvestor = user?.userType === "Investor";
  // Capacity is measured against commitments, because that is what closes a round
  // to new requests — the same rule the server enforces.
  const remaining = Math.max(0, project.investmentNeeded - project.committedAmount);

  const { data: mine } = useQuery({
    queryKey: ["my-support", project.id],
    queryFn: () => investorApi.mySupport(project.id),
    enabled: isInvestor && !owner,
  });
  const supported = mine != null && mine.status !== "none";

  const meta = [project.category, project.location].filter(Boolean);

  return (
    <DepthScene intensity={0.55} perspective={1400}>
      <div className="group/panel overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm transition-colors duration-500 hover:border-primary/30">
        {/* Depth is carried by the panel's own furniture: the light sits behind
            the surface, the readings float just in front of it. */}
        <DepthLayer
          z={-40}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--primary) 9%, transparent), transparent 65%)",
          }}
        />
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <DepthLayer z={18} className="p-6 sm:p-7">
          {/* Label + status */}
          <div className="flex items-center justify-between">
            <p className={`text-[11px] text-primary ${rtl ? "" : "uppercase tracking-[0.25em]"}`}>
              {t("support.panel.label")}
            </p>
            <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <motion.span
                animate={{ opacity: funded ? 1 : [1, 0.35, 1] }}
                transition={{ duration: 2, repeat: funded ? 0 : Infinity, ease: "easeInOut" }}
                className={`size-1.5 rounded-full ${funded ? "bg-primary" : "bg-bronze"}`}
              />
              {funded ? t("proj.card.completed") : t("proj.card.needs")}
            </span>
          </div>

          {/* The instrument.

              Two arcs, not one: settled money in front, commitments behind it. The
              headline figure is what actually arrived — this panel used to lead with
              the sum of approvals and call it raised, which meant a venture with no
              money in it displayed a large gold number. The commitment total is still
              here, one line down, in the position that matches what it is. */}
          <div className="mt-6 flex items-center gap-5">
            <FundingDial
              funded={project.fundedAmount}
              committed={project.committedAmount}
              goal={project.investmentNeeded}
              size={86}
            />
            <div className="min-w-0">
              <p className="font-numeric truncate text-[2.1rem] leading-none text-bronze">
                <AnimatedNumber value={project.fundedAmount} format={usd} duration={1.4} />
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("proj.detail.goal")}:{" "}
                <span className="font-numeric text-foreground">
                  {usd(project.investmentNeeded)}
                </span>
              </p>
              {project.committedAmount > project.fundedAmount && (
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  {t("venture.committed.also").replace(
                    "{committed}",
                    compactUsd(project.committedAmount)
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Metrics grid — only the two facts the dial does not already state. */}
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <Metric
              value={
                <AnimatedNumber value={project.numberOfInvestors} format={String} duration={1} />
              }
              label={t("proj.card.investors")}
              delay={0.18}
            />
            <Metric
              value={<AnimatedNumber value={remaining} format={compactUsd} duration={1.4} />}
              label={t("support.stat.remaining")}
              delay={0.26}
            />
          </div>

          {/* Why the two numbers differ, said once, where the difference is visible. */}
          {project.committedAmount > project.fundedAmount && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/75">
              {t("venture.committedNotFunded")}
            </p>
          )}

          {/* Detail rows */}
          <div className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
            <FounderLink
              ownerId={project.ownerId}
              ownerName={project.ownerName}
              className="-mx-1 px-1 pb-1"
            />
            {project.stage && <DetailRow label={t("proj.deal.stage")} value={project.stage} />}
            {project.valuation != null && (
              <DetailRow label={t("proj.deal.valuation")} value={usd(project.valuation, 0)} />
            )}
            {project.equityOffered != null && (
              <DetailRow label={t("proj.deal.equity")} value={`${project.equityOffered}%`} />
            )}
            {meta.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {meta.map((m) => (
                  <span
                    key={m}
                    className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action */}
          <div className="mt-6">
          {owner ? (
            <div className="space-y-3 text-center">
              <p className="text-xs text-muted-foreground">{t("support.owner")}</p>
              <PillButton
                href={`/my-projects/${project.id}/edit`}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {t("support.owner.manage")}
              </PillButton>
            </div>
          ) : isInvestor ? (
            supported && mine ? (
              <SupportStatusBox mine={mine} />
            ) : (
              <PillButton onClick={() => setOpen(true)} size="lg" className="w-full">
                {t("support.button")}
              </PillButton>
            )
          ) : user ? (
            <p className="rounded-xl border border-dashed border-border py-3 text-center text-xs text-muted-foreground">
              {t("support.investorsOnly")}
            </p>
          ) : (
            /* Guests reach this page from public browse. Telling them what they
               cannot do is a dead end at the exact moment they are convinced —
               so offer the way in instead. */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.34, ease: EASE }}
              className="relative overflow-hidden rounded-xl border border-primary/30 bg-primary/[0.05] p-5 text-center"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
              />
              <p className="text-sm font-medium text-foreground">{t("support.guest.title")}</p>
              <p className="mx-auto mt-1.5 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                {t("support.guest.body")}
              </p>
              <PillButton href="/register" size="lg" className="mt-4 w-full">
                {t("support.guest.cta")}
              </PillButton>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {t("support.guest.have")}{" "}
                <Link
                  href="/login"
                  data-cursor="hover"
                  className="link-underline text-foreground transition-colors hover:text-primary"
                >
                  {t("support.guest.signin")}
                </Link>
              </p>
            </motion.div>
          )}
        </div>

          {/* Reach the founder directly (hidden for the owner + guests). */}
          <MessageLauncher
            userId={project.ownerId}
            labelKey="msg.messageFounder"
            variant="ghost"
            className="mt-3 w-full"
          />
        </DepthLayer>
      </div>

      {isInvestor && !owner && (
        <SupportModal project={project} open={open} onOpenChange={setOpen} />
      )}
    </DepthScene>
  );
}

// The dial that used to live here has moved to components/funding — the same
// instrument is now used on the venture page, in the deal room and on the
// dashboards, so the shape of "how far along is this" cannot differ by screen.
