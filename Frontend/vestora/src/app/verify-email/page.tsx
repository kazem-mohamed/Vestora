"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { emailError } from "@/lib/validation/rules";
import { useLocale } from "@/lib/i18n/locale";
import { AuthStage } from "@/components/auth/auth-stage";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { Alert, AlertSlot } from "@/components/ui/alert";

function VerifyEmailForm() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState(params.get("email") ?? "");
  // Set by /register when the server reported the code could not be delivered.
  const undelivered = params.get("undelivered") === "1";
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; code?: boolean }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;

    const next: { email?: string; code?: string } = {};
    const ee = emailError(email);
    if (ee) next.email = t(ee);
    if (code.trim().length === 0) next.code = t("valid.required");
    setErrors(next);
    setTouched({ email: true, code: true });
    if (Object.keys(next).length > 0) return;

    inFlight.current = true;
    setPending(true);
    setFormError(null);
    try {
      await authApi.verifyEmail(email.trim(), code.trim());
      // Verified accounts land on sign-in with the reason carried in the URL, rather
      // than on a toast that has expired by the time the page paints.
      router.push("/login?verified=1");
    } catch (err) {
      // A wrong or expired code belongs on the code field — that is the thing to change.
      const message = err instanceof ApiError ? err.message : t("verify.failed");
      setErrors((p) => ({ ...p, code: message }));
      setTouched((p) => ({ ...p, code: true }));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  async function resend() {
    if (resending) return;
    const ee = emailError(email);
    if (ee) {
      setErrors((p) => ({ ...p, email: t(ee) }));
      setTouched((p) => ({ ...p, email: true }));
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerification(email.trim());
      // A resend genuinely is transient feedback with nothing to act on — the one place
      // on this page where a toast is the right surface.
      toast.success(t("verify.resent"));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("verify.failed"));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthStage eyebrow={t("verify.stage.eyebrow")} title={t("verify.stage.title")}>
      <h2
        className="text-[1.6rem] font-bold leading-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {t("verify.title")}
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
        {undelivered ? t("verify.subtitleUndelivered") : t("verify.subtitle")}
      </p>

      {/* Arriving here knowing the code never went out. Saying so — and pointing at
          Resend rather than at the inbox — is the difference between a person waiting
          and a person acting. */}
      {undelivered && (
        <Alert className="mt-5" tone="warning" title={t("register.codeNotSent")}>
          {t("register.codeNotSentBody")}
        </Alert>
      )}

      <AlertSlot show={formError !== null}>
        {formError && (
          <Alert
            className="mt-5"
            tone="error"
            live="assertive"
            title={t("verify.failed")}
            onDismiss={() => setFormError(null)}
            dismissLabel={t("form.cancel")}
          >
            {formError}
          </Alert>
        )}
      </AlertSlot>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <AuthField
          label={t("verify.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={pending}
          value={email}
          state={touched.email && errors.email ? "invalid" : "default"}
          message={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFormError(null);
            if (touched.email) {
              const err = emailError(e.target.value);
              setErrors((p) => ({ ...p, email: err ? t(err) : undefined }));
            }
          }}
          onBlur={() => {
            setTouched((p) => ({ ...p, email: true }));
            const err = emailError(email);
            setErrors((p) => ({ ...p, email: err ? t(err) : undefined }));
          }}
        />

        <AuthField
          label={t("verify.code")}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={12}
          autoFocus
          readOnly={pending}
          value={code}
          state={touched.code && errors.code ? "invalid" : "default"}
          message={errors.code}
          inputClassName="font-numeric h-12 text-center text-lg tracking-[0.4em]"
          onChange={(e) => {
            setCode(e.target.value);
            // Typing clears the previous rejection: the old message no longer describes
            // what is in the field.
            if (errors.code) setErrors((p) => ({ ...p, code: undefined }));
          }}
          onBlur={() => setTouched((p) => ({ ...p, code: true }))}
        />

        <AuthSubmit
          pending={pending}
          label={t("verify.submit")}
          pendingLabel={t("verify.submitting")}
          className="pt-1"
        />
      </form>

      <div className="mt-7 space-y-3 border-t border-border/60 pt-6 text-center text-[13px] text-muted-foreground">
        <p>
          {t("verify.resendPre")}{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            data-cursor="hover"
            className="link-underline font-medium text-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-50"
          >
            {resending ? t("verify.resending") : t("verify.resend")}
          </button>
        </p>
        <p>
          <Link
            href="/login"
            data-cursor="hover"
            className="link-underline transition-colors hover:text-foreground"
          >
            {t("forgot.back")}
          </Link>
        </p>
      </div>
    </AuthStage>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
