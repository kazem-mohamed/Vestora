"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PillButton } from "@/components/ui/pill-button";
import { projectsApi } from "@/lib/api/projects";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { markOnboardingComplete } from "@/lib/onboarding";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One-time post-login step (gated client-side, see lib/onboarding.ts). Closes
 * the "dropped on the homepage with zero guidance" gap: investors pick
 * industries that immediately power the Recommended section on /projects,
 * founders are pointed straight at creating their first venture.
 */
export default function OnboardingPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isInvestor = user?.userType === "Investor";

  const [selected, setSelected] = useState<string[]>([]);

  const filtersQuery = useQuery({
    queryKey: ["project-filters"],
    queryFn: () => projectsApi.filters(),
    enabled: isInvestor,
    staleTime: 5 * 60 * 1000,
  });

  const saveInterests = useMutation({
    mutationFn: () => usersApi.updateMe({ preferredIndustries: selected.join(", ") }),
    onError: (e: Error) => toast.error(e.message),
  });

  function toggle(industry: string) {
    setSelected((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  }

  async function finish(destination?: string) {
    if (!user) return;
    if (isInvestor && selected.length > 0) {
      await saveInterests.mutateAsync();
    }
    markOnboardingComplete(user.id);
    router.replace(destination ?? (isInvestor ? "/invest" : "/dashboard"));
  }

  if (!user) return null;

  return (
    <div className="mx-auto flex min-h-[70svh] max-w-2xl flex-col justify-center px-6 py-16">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.3em]"}`}
      >
        {t("onboard.eyebrow")}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
        className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {t("onboard.welcome").replace("{name}", user.userName)}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
        className="mt-3 max-w-lg text-sm text-muted-foreground"
      >
        {isInvestor ? t("onboard.investor.body") : t("onboard.founder.body")}
      </motion.p>

      {isInvestor ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.26, ease: EASE }}
          className="mt-10"
        >
          <p className="text-sm font-medium">{t("onboard.investor.pick")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(filtersQuery.data?.industries ?? []).map((industry) => {
              const active = selected.includes(industry);
              return (
                <button
                  key={industry}
                  type="button"
                  data-cursor="hover"
                  onClick={() => toggle(industry)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {industry}
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : (
        /* A founder's first need is a listing, not a preference. The three steps
           are the real path to being visible on Vestora, so the page states them
           and hands over the first one instead of showing a sentence. */
        <motion.ol
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.24 } } }}
          className="mt-10 space-y-3"
        >
          {FOUNDER_STEPS.map((step, i) => (
            <motion.li
              key={step.titleKey}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
              }}
              className="flex gap-4 rounded-2xl border border-border/70 bg-card/40 p-5 transition-colors duration-300 hover:border-primary/30"
            >
              <span
                className="font-numeric grid size-8 shrink-0 place-items-center rounded-full bg-primary/[0.09] text-sm text-primary"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t(step.titleKey)}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t(step.bodyKey)}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      )}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: isInvestor ? 0.34 : 0.58, ease: EASE }}
        className="mt-10 flex flex-wrap items-center gap-4"
      >
        <PillButton
          onClick={() => finish(isInvestor ? undefined : "/my-projects/new")}
          disabled={saveInterests.isPending}
          size="lg"
        >
          {saveInterests.isPending
            ? t("onboard.saving")
            : isInvestor
              ? t("onboard.continue")
              : t("onboard.founder.cta")}
        </PillButton>
        {/* Skipping is always available; for a founder it lands on the control
            room rather than the creation form. */}
        {(isInvestor ? selected.length === 0 : true) && (
          <button
            type="button"
            data-cursor="hover"
            onClick={() => finish()}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {isInvestor ? t("onboard.skip") : t("onboard.founder.later")}
          </button>
        )}
      </motion.div>
    </div>
  );
}

const FOUNDER_STEPS = [
  { titleKey: "onboard.founder.step1.title", bodyKey: "onboard.founder.step1.body" },
  { titleKey: "onboard.founder.step2.title", bodyKey: "onboard.founder.step2.body" },
  { titleKey: "onboard.founder.step3.title", bodyKey: "onboard.founder.step3.body" },
];
