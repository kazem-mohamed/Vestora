"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { emailError } from "@/lib/validation/rules";
import { useLocale } from "@/lib/i18n/locale";
import { AuthStage } from "@/components/auth/auth-stage";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { Alert, AlertSlot } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Back = rtl ? ArrowRight : ArrowLeft;
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;

    const err = emailError(email);
    setTouched(true);
    setError(err ? t(err) : undefined);
    if (err) return;

    inFlight.current = true;
    setPending(true);
    setFailure(null);
    try {
      await authApi.forgotPassword(email.trim());
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err2) {
      setFailure(err2 instanceof ApiError ? err2.message : t("login.fail.network.body"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <AuthStage eyebrow={t("forgot.stage.eyebrow")} title={t("forgot.stage.title")}>
      <h2
        className="text-[1.6rem] font-bold leading-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {t("forgot.title")}
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
        {t("forgot.subtitle")}
      </p>

      {/* Standing context, not a transient message — which is exactly the distinction
          between an Alert and a toast. It explains why the next screen asks for a code
          even when the address was never registered: the API answers identically either
          way, and saying so here is what stops that non-disclosure reading as a bug. */}
      <Alert className="mt-6" tone="info">
        {t("forgot.privacyNote")}
      </Alert>

      <AlertSlot show={failure !== null}>
        {failure && (
          <Alert
            className="mt-4"
            tone="error"
            live="assertive"
            title={t("login.fail.network.title")}
            onDismiss={() => setFailure(null)}
            dismissLabel={t("form.cancel")}
          >
            {failure}
          </Alert>
        )}
      </AlertSlot>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <AuthField
          label={t("forgot.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={pending}
          value={email}
          state={touched && error ? "invalid" : "default"}
          message={error}
          onChange={(e) => {
            setEmail(e.target.value);
            setFailure(null);
            if (touched) {
              const err = emailError(e.target.value);
              setError(err ? t(err) : undefined);
            }
          }}
          onBlur={() => {
            setTouched(true);
            const err = emailError(email);
            setError(err ? t(err) : undefined);
          }}
        />

        <AuthSubmit
          pending={pending}
          label={t("forgot.submit")}
          pendingLabel={t("forgot.submitting")}
          className="pt-1"
        />
      </form>

      <p className="mt-7 border-t border-border/60 pt-6 text-center text-[13px]">
        <Link
          href="/login"
          data-cursor="hover"
          className="link-underline inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Back className="size-3.5" />
          {t("forgot.back")}
        </Link>
      </p>
    </AuthStage>
  );
}
