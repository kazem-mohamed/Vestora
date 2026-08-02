"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { emailError, passwordHardError, passwordMeetsAll } from "@/lib/validation/rules";
import { mapServerErrors } from "@/lib/validation/server-errors";
import { useLocale } from "@/lib/i18n/locale";
import { AuthStage } from "@/components/auth/auth-stage";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Alert, AlertSlot } from "@/components/ui/alert";

type Field = "email" | "otp" | "password" | "confirmPassword";

const SERVER_FIELD_MAP: Record<string, Field> = {
  Email: "email",
  Otp: "otp",
  Password: "password",
  ConfirmPassword: "confirmPassword",
};

function ResetPasswordForm() {
  const { t } = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const [values, setValues] = useState({
    email: params.get("email") ?? "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  /**
   * The same rules registration uses, from the same module.
   *
   * This page previously validated `min(8)` while displaying the message "must be at
   * least 6 characters", and registration validated 6 — three different answers to one
   * question across two pages. Now that the server enforces a single policy, a page that
   * accepted less would just hand the person a rejection after they had submitted.
   */
  function check(field: Field, v = values): string | undefined {
    switch (field) {
      case "email": {
        const e = emailError(v.email);
        return e ? t(e) : undefined;
      }
      case "otp":
        return v.otp.trim().length === 0 ? t("valid.required") : undefined;
      case "password": {
        if (v.password.length === 0) return t("valid.required");
        const hard = passwordHardError(v.password, v.email);
        if (hard) return t(hard);
        if (!passwordMeetsAll(v.password)) return t("valid.pw.unmet");
        return undefined;
      }
      case "confirmPassword": {
        if (v.confirmPassword.length === 0) return t("valid.required");
        return v.confirmPassword !== v.password ? t("valid.passwordMatch") : undefined;
      }
    }
  }

  function setValue(key: Field, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    setFormError(null);
    if (touched[key] || key === "password" || key === "confirmPassword") {
      setErrors((p) => ({ ...p, [key]: check(key, next) }));
    }
    if (key === "password" && touched.confirmPassword) {
      setErrors((p) => ({ ...p, confirmPassword: check("confirmPassword", next) }));
    }
  }

  function blur(field: Field) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors((p) => ({ ...p, [field]: check(field) }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;

    const all: Field[] = ["email", "otp", "password", "confirmPassword"];
    const next: Partial<Record<Field, string>> = {};
    for (const f of all) next[f] = check(f);
    setErrors(next);
    setTouched(Object.fromEntries(all.map((f) => [f, true])));
    if (all.some((f) => next[f])) return;

    inFlight.current = true;
    setPending(true);
    try {
      await authApi.resetPassword({
        email: values.email.trim(),
        otp: values.otp.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      router.push("/login?reset=1");
    } catch (err) {
      const mapped = mapServerErrors<Field>(err, SERVER_FIELD_MAP);
      if (Object.keys(mapped.fields).length > 0) {
        setErrors((p) => ({ ...p, ...mapped.fields }));
        setTouched((p) => ({
          ...p,
          ...Object.fromEntries(Object.keys(mapped.fields).map((k) => [k, true])),
        }));
      }
      if (mapped.general.length > 0) setFormError(mapped.general[0]);
      else if (Object.keys(mapped.fields).length === 0) setFormError(t("reset.failed"));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const stateOf = (f: Field): "default" | "invalid" =>
    touched[f] && errors[f] ? "invalid" : "default";

  return (
    <AuthStage eyebrow={t("reset.stage.eyebrow")} title={t("reset.stage.title")}>
      <h2
        className="text-[1.6rem] font-bold leading-tight"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {t("reset.title")}
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
        {t("reset.subtitle")}
      </p>

      <AlertSlot show={formError !== null}>
        {formError && (
          <Alert
            className="mt-5"
            tone="error"
            live="assertive"
            title={t("reset.failed")}
            onDismiss={() => setFormError(null)}
            dismissLabel={t("form.cancel")}
          >
            {formError}
          </Alert>
        )}
      </AlertSlot>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <AuthField
          label={t("reset.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          readOnly={pending}
          value={values.email}
          state={stateOf("email")}
          message={errors.email}
          onChange={(e) => setValue("email", e.target.value)}
          onBlur={() => blur("email")}
        />

        <AuthField
          label={t("reset.otp")}
          // A one-time numeric token: the numeric keyboard on a phone, and the
          // autocomplete token that lets iOS and Android offer it straight from the
          // notification instead of making someone switch apps to copy it.
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={12}
          readOnly={pending}
          value={values.otp}
          state={stateOf("otp")}
          message={errors.otp}
          inputClassName="font-numeric tracking-[0.3em]"
          onChange={(e) => setValue("otp", e.target.value)}
          onBlur={() => blur("otp")}
        />

        <div>
          <AuthField
            label={t("reset.password")}
            reveal
            autoComplete="new-password"
            readOnly={pending}
            value={values.password}
            state={
              touched.password && errors.password && errors.password !== t("valid.pw.unmet")
                ? "invalid"
                : "default"
            }
            message={errors.password !== t("valid.pw.unmet") ? errors.password : undefined}
            onChange={(e) => setValue("password", e.target.value)}
            onBlur={() => blur("password")}
          />
          <PasswordRequirements
            value={values.password}
            show={values.password.length > 0 || Boolean(touched.password)}
          />
        </div>

        <AuthField
          label={t("reset.confirmPassword")}
          reveal
          autoComplete="new-password"
          readOnly={pending}
          value={values.confirmPassword}
          state={
            touched.confirmPassword && errors.confirmPassword
              ? "invalid"
              : touched.confirmPassword && values.confirmPassword.length > 0
                ? "valid"
                : "default"
          }
          message={errors.confirmPassword}
          onChange={(e) => setValue("confirmPassword", e.target.value)}
          onBlur={() => blur("confirmPassword")}
        />

        <AuthSubmit
          pending={pending}
          label={t("reset.submit")}
          pendingLabel={t("reset.submitting")}
          className="pt-1"
        />
      </form>

      <p className="mt-7 border-t border-border/60 pt-6 text-center text-[13px] text-muted-foreground">
        <Link
          href="/forgot-password"
          data-cursor="hover"
          className="link-underline transition-colors hover:text-foreground"
        >
          {t("reset.resend")}
        </Link>
      </p>
    </AuthStage>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
