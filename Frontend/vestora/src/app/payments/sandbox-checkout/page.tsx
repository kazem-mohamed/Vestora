"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Check, FlaskConical, X } from "lucide-react";
import { toast } from "sonner";
import { EASE, SandboxBadge, exactMoney } from "@/components/funding/funding-primitives";
import { paymentsApi } from "@/lib/api/payments";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Vestora's own checkout, used when the offline simulator is the active provider.
 *
 * It exists so a demonstration cannot fail because a room's network did. It is
 * NOT a shortcut around the payment system: resolving a session here goes through
 * the provider adapter, the transaction state machine, the idempotency gate, the
 * fee snapshot and the notifications exactly as Stripe's hosted page does. The
 * only thing missing is the card form, and Vestora would never have seen that.
 *
 * Choosing the outcome is the point. Showing a declined payment on demand is
 * something a real sandbox makes awkward and a demonstration needs.
 */
export default function SandboxCheckoutPage() {
  return (
    <Suspense fallback={<Shell />}>
      <SandboxCheckout />
    </Suspense>
  );
}

function SandboxCheckout() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion() ?? false;

  const sessionId = params.get("session") ?? "";
  // Where to send the investor back to. Supplied by the provider when it opened the
  // session, the same way Stripe is handed success and cancel URLs — this page does
  // not get to invent a destination.
  const returnUrl = params.get("return") ?? "/payments/return";
  const cancelUrl = params.get("cancel") ?? returnUrl;
  const [chosen, setChosen] = useState<string | null>(null);

  const { data: session, isLoading, isError } = useQuery({
    queryKey: ["sandbox-session", sessionId],
    queryFn: () => paymentsApi.describeSandboxSession(sessionId),
    enabled: sessionId.length > 0,
    retry: false,
  });

  // The simulator keeps sessions in memory, so restarting the API forgets them.
  // Rather than leave the investor staring at a dash where an amount should be,
  // say what happened and send them back to the one place that can reopen it.
  const sessionLost = isError || (!isLoading && !session);

  const resolve = useMutation({
    mutationFn: (outcome: "success" | "failure" | "cancel") =>
      paymentsApi.resolveSandboxSession(sessionId, outcome),
    onSuccess: (_r, outcome) => {
      // The provider has decided. Vestora now finds out the same way it would find
      // out from Stripe — by returning to the URL the session was given, where the
      // server does the asking. The outcome in the query string is a hint for the
      // holding state only; it is never trusted as the result.
      const target = outcome === "cancel" ? cancelUrl : returnUrl;
      const sep = target.includes("?") ? "&" : "?";
      router.replace(`${target}${sep}hint=${outcome}`);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setChosen(null);
    },
  });

  const busy = resolve.isPending;

  return (
    <Shell>
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, rotateX: 6 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.75, ease: EASE }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] border border-border bg-card/70 backdrop-blur-md"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bronze/70 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--bronze) 8%, transparent), transparent 60%)",
          }}
        />

        <div className="relative p-7 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[11px] text-bronze">
              <FlaskConical className="size-3.5" strokeWidth={1.9} />
              <span className={rtl ? "" : "uppercase tracking-[0.2em]"}>
                {t("pay.sandbox.title")}
              </span>
            </span>
            <SandboxBadge />
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("pay.sandbox.sub")}
          </p>

          {sessionLost ? (
            /* ---- The session no longer exists ---- */
            <div className="mt-7">
              <div className="rounded-2xl border border-bronze/35 bg-bronze/[0.05] p-5">
                <p className="text-sm font-medium text-bronze">{t("pay.sandbox.lost.title")}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                  {t("pay.sandbox.lost.body")}
                </p>
              </div>
              <Link
                href="/invest/payments"
                data-cursor="hover"
                className="gold-cta mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("pay.sandbox.lost.cta")}
              </Link>
            </div>
          ) : (
            <>
              {/* ---- What is being paid ---- */}
              <div className="mt-7 rounded-2xl border border-border/70 bg-background/40 p-5 text-center">
                <p
                  className={cn(
                    "text-[10.5px] text-muted-foreground",
                    rtl ? "" : "uppercase tracking-[0.18em]"
                  )}
                >
                  {t("pay.sandbox.paying")}
                </p>
                {isLoading ? (
                  <div className="skeleton-shimmer mx-auto mt-3 h-9 w-40 rounded-lg" />
                ) : (
                  <motion.p
                    initial={reduce ? undefined : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                    className="font-numeric mt-2.5 text-4xl leading-none text-bronze"
                  >
                    {session ? exactMoney(session.amount) : "—"}
                  </motion.p>
                )}
                {session && (
                  <p className="font-numeric mt-3 text-[11px] text-muted-foreground/75">
                    {session.reference}
                  </p>
                )}
              </div>

              {/* ---- The three outcomes ---- */}
              <div className="mt-7 space-y-2.5">
                <OutcomeButton
                  tone="approve"
                  label={t("pay.sandbox.succeed")}
                  icon={Check}
                  busy={busy && chosen === "success"}
                  disabled={busy || !session}
                  onClick={() => {
                    setChosen("success");
                    resolve.mutate("success");
                  }}
                />
                <OutcomeButton
                  tone="decline"
                  label={t("pay.sandbox.decline")}
                  icon={X}
                  busy={busy && chosen === "failure"}
                  disabled={busy || !session}
                  onClick={() => {
                    setChosen("failure");
                    resolve.mutate("failure");
                  }}
                />
                <button
                  type="button"
                  disabled={busy || !session}
                  data-cursor="hover"
                  onClick={() => {
                    setChosen("cancel");
                    resolve.mutate("cancel");
                  }}
                  className="link-underline mx-auto block pt-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {busy && chosen === "cancel"
                    ? t("pay.sandbox.working")
                    : t("pay.sandbox.abandon")}
                </button>
              </div>
            </>
          )}

          <p className="mt-7 border-t border-border/60 pt-4 text-[11px] leading-relaxed text-muted-foreground/80">
            {t("pay.sandbox.why")}
          </p>
        </div>
      </motion.div>
    </Shell>
  );
}

function OutcomeButton({
  tone,
  label,
  icon: Icon,
  busy,
  disabled,
  onClick,
}: {
  tone: "approve" | "decline";
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-cursor="hover"
      className={cn(
        "group flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full text-sm font-semibold outline-none transition-all duration-300",
        "focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-45",
        tone === "approve"
          ? "gold-cta bg-primary text-primary-foreground hover:opacity-90"
          : "border border-destructive/45 text-destructive hover:border-destructive/70 hover:bg-destructive/[0.06]"
      )}
    >
      {busy ? (
        <>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className={cn(
              "size-3.5 rounded-full border-2",
              tone === "approve"
                ? "border-primary-foreground/30 border-t-primary-foreground"
                : "border-destructive/30 border-t-destructive"
            )}
          />
          {t("pay.sandbox.working")}
        </>
      ) : (
        <>
          <Icon className="size-4 transition-transform duration-300 group-hover:scale-110" strokeWidth={2.1} />
          {label}
        </>
      )}
    </button>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main
      className="grid min-h-screen place-items-center px-6 py-16"
      style={{ perspective: 1400 }}
    >
      {children}
    </main>
  );
}
