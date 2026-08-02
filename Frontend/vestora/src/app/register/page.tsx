"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Landmark, Rocket, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import {
  BIO_MAX,
  bioError,
  birthDateError,
  emailError,
  nameError,
  passwordHardError,
  passwordMeetsAll,
  phoneError,
} from "@/lib/validation/rules";
import { isDuplicateEmail, mapServerErrors } from "@/lib/validation/server-errors";
import { AuthStage } from "@/components/auth/auth-stage";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { Alert, AlertSlot } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

const EASE = [0.22, 1, 0.36, 1] as const;

type Field =
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "confirmPassword"
  | "phone"
  | "birthDate"
  | "briefBio"
  | "agree";

/** Server property name → the field it belongs beside. */
const SERVER_FIELD_MAP: Record<string, Field> = {
  FirstName: "firstName",
  LastName: "lastName",
  Email: "email",
  Password: "password",
  ConfirmPassword: "confirmPassword",
  Phone: "phone",
  BirthDate: "birthDate",
  BriefBio: "briefBio",
};

/**
 * When each field is judged.
 *
 * This is the whole substance of "early feedback without hostile validation". A single
 * global strategy cannot be right for every input: validating a name on change tells
 * someone typing "Kazem" that "K" is too short, and validating a passcode only on submit
 * means discovering four rules at once after filling everything in.
 *
 * - `blur`   — names, email, phone. You only know if a name is wrong once it is finished.
 * - `change` — passcode, confirmation, date, bio. Each has a live display beside it (the
 *              requirement list, the match, the counter) so silence would be strange.
 * - `submit` — the terms box. There is nothing to correct mid-form.
 *
 * Every field switches to `change` *after* its first judgement regardless, so a
 * correction is reflected as it is typed rather than requiring another blur.
 */
const TIMING: Record<Exclude<Field, "agree">, "blur" | "change"> = {
  firstName: "blur",
  lastName: "blur",
  email: "blur",
  phone: "blur",
  password: "change",
  confirmPassword: "change",
  birthDate: "change",
  briefBio: "change",
};

export default function RegisterPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const shake = useAnimationControls();

  const [values, setValues] = useState({
    userType: "Investor" as "Investor" | "Innovator",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    birthDate: "",
    briefBio: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  /** The rule for one field, returned as a translated message or undefined. */
  function check(field: Field, v = values): string | undefined {
    switch (field) {
      case "firstName":
      case "lastName": {
        const e = nameError(v[field]);
        return e ? t(e) : undefined;
      }
      case "email": {
        const e = emailError(v.email);
        return e ? t(e) : undefined;
      }
      case "password": {
        if (v.password.length === 0) return t("valid.required");
        const hard = passwordHardError(v.password, v.email);
        if (hard) return t(hard);
        if (!passwordMeetsAll(v.password)) return t("valid.pw.unmet");
        return undefined;
      }
      case "confirmPassword": {
        if (v.confirmPassword.length === 0) return t("valid.required");
        if (v.confirmPassword !== v.password) return t("valid.passwordMatch");
        return undefined;
      }
      case "phone": {
        const e = phoneError(v.phone);
        return e ? t(e) : undefined;
      }
      case "birthDate": {
        const e = birthDateError(v.birthDate);
        return e ? t(e) : undefined;
      }
      case "briefBio": {
        const e = bioError(v.briefBio);
        return e ? t(e) : undefined;
      }
      case "agree":
        return v.agree ? undefined : t("valid.terms");
    }
  }

  function setValue<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    setFormError(null);

    const field = key as Field;
    // Re-judge on change when this field's timing says so, or when it has already been
    // judged once — a correction should clear the message as it is made.
    const live = TIMING[field as Exclude<Field, "agree">] === "change" || touched[field];
    if (live) {
      setErrors((p) => ({ ...p, [field]: check(field, next) }));
      // Changing *is* the interaction that earns feedback for a change-timed field, so
      // it counts as touched. Without this the error was computed and then never
      // displayed, because the display gate waits for a blur that these fields are not
      // supposed to need — which quietly turned "change" timing into "submit" timing.
      if (!touched[field]) setTouched((p) => ({ ...p, [field]: true }));
    }
    // The confirmation depends on the passcode, so editing the passcode has to re-judge
    // it too — otherwise "doesn't match" lingers after the match is fixed from the
    // other side.
    if (key === "password" && touched.confirmPassword) {
      setErrors((p) => ({ ...p, confirmPassword: check("confirmPassword", next) }));
    }
  }

  function onBlurField(field: Field) {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors((p) => ({ ...p, [field]: check(field) }));
  }

  function stateOf(field: Field, confirmable = false): "default" | "invalid" | "valid" {
    if (touched[field] && errors[field]) return "invalid";
    // Confirmation is only shown where it genuinely helps — the email and the passcode
    // match. Ticking every filled field turns the form into a scoreboard.
    if (confirmable && touched[field] && !errors[field] && String(values[field as keyof typeof values]).length > 0) {
      return "valid";
    }
    return "default";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;

    // Judge everything, mark everything touched, then stop at the first offender.
    const all: Field[] = [
      "firstName", "lastName", "email", "password", "confirmPassword",
      "phone", "birthDate", "briefBio", "agree",
    ];
    const next: Partial<Record<Field, string>> = {};
    for (const f of all) next[f] = check(f);
    setErrors(next);
    setTouched(Object.fromEntries(all.map((f) => [f, true])));

    const firstBad = all.find((f) => next[f]);
    if (firstBad) {
      if (!reduce) {
        shake.start({ x: [0, -6, 5, -3, 0], transition: { duration: 0.4 } });
      }
      // Take the person to the problem rather than making them hunt for it.
      const el = formRef.current?.querySelector<HTMLElement>(`[data-field="${firstBad}"]`);
      el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      el?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }

    inFlight.current = true;
    setPending(true);
    try {
      const res = await authApi.register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        userType: values.userType,
        birthDate: values.birthDate,
        phone: values.phone.trim(),
        briefBio: values.briefBio.trim() || undefined,
        profileImage: avatar,
      });

      // The account exists either way, so the destination is the same. What changes
      // is the promise made on the way there: telling someone to check their inbox
      // when the server already knows nothing was sent is the one thing this screen
      // must never do.
      const email = values.email.trim();
      if (res?.emailDelivered === false) {
        toast.warning(t("register.codeNotSent"), {
          description: t("register.codeNotSentBody"),
          duration: 8000,
        });
      }
      router.push(
        `/verify-email?email=${encodeURIComponent(email)}${
          res?.emailDelivered === false ? "&undelivered=1" : ""
        }`
      );
    } catch (err) {
      // A duplicate address belongs beside the address, not in a floating message.
      if (isDuplicateEmail(err)) {
        setErrors((p) => ({ ...p, email: t("register.emailTaken") }));
        setTouched((p) => ({ ...p, email: true }));
        const el = formRef.current?.querySelector<HTMLElement>('[data-field="email"]');
        el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        el?.querySelector<HTMLInputElement>("input")?.focus();
      } else {
        const mapped = mapServerErrors<Field>(err, SERVER_FIELD_MAP);
        if (Object.keys(mapped.fields).length > 0) {
          setErrors((p) => ({ ...p, ...mapped.fields }));
          setTouched((p) => ({
            ...p,
            ...Object.fromEntries(Object.keys(mapped.fields).map((k) => [k, true])),
          }));
          const first = Object.keys(mapped.fields)[0];
          formRef.current
            ?.querySelector<HTMLElement>(`[data-field="${first}"]`)
            ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        }
        if (mapped.general.length > 0) setFormError(mapped.general[0]);
        else if (Object.keys(mapped.fields).length === 0) {
          setFormError(t("register.failed"));
        }
      }
      if (!reduce) shake.start({ x: [0, -6, 5, -3, 0], transition: { duration: 0.4 } });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const roles = [
    {
      value: "Investor" as const,
      label: t("register.role.investor"),
      desc: t("register.role.investorDesc"),
      icon: Landmark,
    },
    {
      value: "Innovator" as const,
      label: t("register.role.innovator"),
      desc: t("register.role.innovatorDesc"),
      icon: Rocket,
    },
  ];

  return (
    <AuthStage
      wide
      eyebrow={t("register.stage.eyebrow")}
      title={t("register.stage.title")}
    >
      <motion.div animate={shake}>
        <h2
          className="text-[1.6rem] font-bold leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("register.title")}
        </h2>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          {t("register.haveAccount")}{" "}
          <Link
            href="/login"
            data-cursor="hover"
            className="link-underline font-medium text-foreground transition-colors hover:text-primary"
          >
            {t("register.loginLink")}
          </Link>
        </p>

        <AlertSlot show={formError !== null}>
          {formError && (
            <Alert
              className="mt-5"
              tone="error"
              live="assertive"
              title={t("register.failed")}
              onDismiss={() => setFormError(null)}
              dismissLabel={t("form.cancel")}
            >
              {formError}
            </Alert>
          )}
        </AlertSlot>

        <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
          {/* ---- Role. A choice, so it leads. ---- */}
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-foreground/90">
              {t("register.role.legend")}
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              {roles.map((role) => {
                const on = values.userType === role.value;
                const Icon = role.icon;
                return (
                  <button
                    key={role.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-cursor="hover"
                    onClick={() => setValue("userType", role.value)}
                    className={cn(
                      "group/r relative overflow-hidden rounded-xl border p-3.5 text-start outline-none",
                      "transition-[border-color,background-color] duration-300",
                      "focus-visible:ring-3 focus-visible:ring-ring/25",
                      on
                        ? "border-primary/50 bg-primary/[0.06]"
                        : "border-border hover:border-primary/35 hover:bg-foreground/[0.02]"
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId="role-edge"
                        transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE }}
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
                      />
                    )}
                    <Icon
                      className={cn(
                        "size-4 transition-colors duration-300",
                        on ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="mt-2 block text-[13px] font-semibold">{role.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      {role.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div data-field="firstName">
              <AuthField
                label={t("register.firstName")}
                autoComplete="given-name"
                value={values.firstName}
                readOnly={pending}
                state={stateOf("firstName")}
                message={errors.firstName}
                onChange={(e) => setValue("firstName", e.target.value)}
                onBlur={() => onBlurField("firstName")}
              />
            </div>
            <div data-field="lastName">
              <AuthField
                label={t("register.lastName")}
                autoComplete="family-name"
                value={values.lastName}
                readOnly={pending}
                state={stateOf("lastName")}
                message={errors.lastName}
                onChange={(e) => setValue("lastName", e.target.value)}
                onBlur={() => onBlurField("lastName")}
              />
            </div>
          </div>

          <div data-field="email">
            <AuthField
              label={t("register.email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={values.email}
              readOnly={pending}
              // Confirmed, because a typo here costs the whole verification email.
              state={stateOf("email", true)}
              message={errors.email}
              onChange={(e) => setValue("email", e.target.value)}
              onBlur={() => onBlurField("email")}
            />
          </div>

          <div data-field="password">
            <AuthField
              label={t("register.password")}
              reveal
              autoComplete="new-password"
              value={values.password}
              readOnly={pending}
              // The requirement list below carries the detail, so the field itself only
              // goes red for the hard failures — not for "not finished yet".
              state={
                touched.password && errors.password && errors.password !== t("valid.pw.unmet")
                  ? "invalid"
                  : "default"
              }
              message={
                errors.password !== t("valid.pw.unmet") ? errors.password : undefined
              }
              onChange={(e) => setValue("password", e.target.value)}
              onBlur={() => onBlurField("password")}
            />
            <PasswordRequirements
              value={values.password}
              show={values.password.length > 0 || Boolean(touched.password)}
            />
          </div>

          <div data-field="confirmPassword">
            <AuthField
              label={t("register.confirmPassword")}
              reveal
              autoComplete="new-password"
              value={values.confirmPassword}
              readOnly={pending}
              state={stateOf("confirmPassword", true)}
              message={errors.confirmPassword}
              onChange={(e) => setValue("confirmPassword", e.target.value)}
              onBlur={() => onBlurField("confirmPassword")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div data-field="phone">
              <AuthField
                label={t("register.phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+20 100 000 0000"
                value={values.phone}
                readOnly={pending}
                state={stateOf("phone")}
                message={errors.phone}
                hint={t("register.phone.hint")}
                onChange={(e) => setValue("phone", e.target.value)}
                onBlur={() => onBlurField("phone")}
              />
            </div>
            <div data-field="birthDate">
              <AuthField
                label={t("register.birthDate")}
                type="date"
                autoComplete="bday"
                // The picker itself refuses out-of-range dates, so most people never
                // see the message — the rule is still enforced for typed input.
                max={new Date().toISOString().slice(0, 10)}
                value={values.birthDate}
                readOnly={pending}
                state={stateOf("birthDate")}
                message={errors.birthDate}
                onChange={(e) => setValue("birthDate", e.target.value)}
                onBlur={() => onBlurField("birthDate")}
              />
            </div>
          </div>

          {/* ---- Bio (optional) ---- */}
          <div data-field="briefBio">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label htmlFor="reg-bio" className="text-[12.5px] font-medium text-foreground/90">
                {t("register.bio")}
                <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                  {t("form.optional")}
                </span>
              </label>
              <span
                className={cn(
                  "font-numeric text-[11px] tabular-nums",
                  values.briefBio.length > BIO_MAX
                    ? "text-destructive"
                    : "text-muted-foreground/70"
                )}
              >
                {values.briefBio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              id="reg-bio"
              rows={3}
              readOnly={pending}
              value={values.briefBio}
              aria-invalid={Boolean(errors.briefBio) || undefined}
              onChange={(e) => setValue("briefBio", e.target.value)}
              onBlur={() => onBlurField("briefBio")}
              placeholder={t("register.bio.placeholder")}
              className={cn(
                "w-full resize-none rounded-xl border bg-background/50 px-3.5 py-3 text-[14px] outline-none backdrop-blur-sm",
                "transition-[border-color,box-shadow] duration-300 placeholder:text-muted-foreground/60",
                "read-only:text-muted-foreground read-only:opacity-80",
                errors.briefBio
                  ? "border-destructive/60 focus-visible:ring-3 focus-visible:ring-destructive/20"
                  : "border-input focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
              )}
            />
            {errors.briefBio && (
              <p role="alert" className="mt-1.5 text-[11.5px] text-destructive">
                {errors.briefBio}
              </p>
            )}
          </div>

          {/* ---- Avatar (optional) ---- */}
          <div>
            <p className="mb-2 text-[12.5px] font-medium text-foreground/90">
              {t("register.avatar")}
              <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                {t("form.optional")}
              </span>
            </p>
            <label
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-2 text-[13px] outline-none",
                "transition-colors duration-300",
                avatarError
                  ? "border-destructive/60 text-destructive"
                  : "border-input text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Upload className="size-4 shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate">
                {avatar?.name ?? t("register.avatarPick")}
              </span>
              {avatar && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setAvatar(null);
                    setAvatarError(null);
                  }}
                  aria-label={t("form.cancel")}
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={pending}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  // Checked here as well as on the server, so a 5MB photo is refused
                  // before it is uploaded over a phone connection.
                  if (f && f.size > 4 * 1024 * 1024) {
                    setAvatar(null);
                    setAvatarError(t("register.avatar.tooBig"));
                    return;
                  }
                  setAvatarError(null);
                  setAvatar(f);
                }}
              />
            </label>
            {avatarError && (
              <p role="alert" className="mt-1.5 text-[11.5px] text-destructive">
                {avatarError}
              </p>
            )}
          </div>

          {/* ---- Terms ---- */}
          <div data-field="agree">
            <label className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                checked={values.agree}
                aria-invalid={Boolean(touched.agree && errors.agree) || undefined}
                onCheckedChange={(v) => {
                  setValues((p) => ({ ...p, agree: v === true }));
                  setTouched((p) => ({ ...p, agree: true }));
                  setErrors((p) => ({ ...p, agree: v === true ? undefined : t("valid.terms") }));
                }}
                className="mt-0.5"
              />
              <span className="text-[12.5px] leading-relaxed text-muted-foreground">
                {t("register.terms.pre")}{" "}
                <Link
                  href="/legal/terms"
                  target="_blank"
                  data-cursor="hover"
                  className="link-underline font-medium text-foreground transition-colors hover:text-primary"
                >
                  {t("register.terms.link")}
                </Link>
                {" · "}
                <Link
                  href="/legal/privacy"
                  target="_blank"
                  data-cursor="hover"
                  className="link-underline font-medium text-foreground transition-colors hover:text-primary"
                >
                  {t("land.foot.privacy")}
                </Link>
              </span>
            </label>
            {touched.agree && errors.agree && (
              <p role="alert" className="mt-1.5 text-[11.5px] text-destructive">
                {errors.agree}
              </p>
            )}
          </div>

          <AuthSubmit
            pending={pending}
            label={t("register.submit")}
            pendingLabel={t("register.submitting")}
            className="pt-1"
          />

          {/* The one line about what happens next. Registration does not sign you in —
              a verification code does, and saying so here prevents the "nothing
              happened" reading of the redirect. */}
          <p className={cn("text-[11px] leading-relaxed text-muted-foreground", rtl ? "" : "")}>
            {t("register.nextStep")}
          </p>
        </form>
      </motion.div>
    </AuthStage>
  );
}
