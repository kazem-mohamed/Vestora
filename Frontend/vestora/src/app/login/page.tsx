"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";
import { emailError } from "@/lib/validation/rules";
import { useLocale } from "@/lib/i18n/locale";
import { AuthStage } from "@/components/auth/auth-stage";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmit } from "@/components/auth/auth-submit";
import { Alert, AlertSlot } from "@/components/ui/alert";

/**
 * How a failure is presented depends on what kind of failure it is.
 *
 * `credentials` is the ordinary case and stays deliberately vague, because the API
 * returns one message for an unknown email and for a wrong password — that
 * non-disclosure is a security property, and this page must not undo it by attaching the
 * error to a specific field only when the address happens to exist.
 *
 * The other kinds are states of the account rather than of the attempt, and each has a
 * different way out, so each gets its own wording and its own action.
 */
type Failure = "credentials" | "locked" | "unverified" | "suspended" | "network";

function classify(err: unknown): { kind: Failure; message: string } {
  if (!(err instanceof ApiError)) return { kind: "network", message: "" };
  const m = err.message.toLowerCase();
  if (m.includes("locked")) return { kind: "locked", message: err.message };
  if (m.includes("verify")) return { kind: "unverified", message: err.message };
  if (m.includes("suspended")) return { kind: "suspended", message: err.message };
  return { kind: "credentials", message: err.message };
}

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});
  const [failure, setFailure] = useState<{ kind: Failure; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // The real guard against a double submit. `disabled` on the button is not enough on
  // its own — a held Enter can dispatch twice before React commits the re-render — so
  // the handler checks this ref synchronously on entry.
  const inFlight = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();

  /**
   * Login validation stays minimal on purpose: an empty field, and an address that is
   * not an address. Nothing here probes whether an account exists — that would leak
   * exactly what the API's single "Invalid email or password" exists to protect.
   */
  function validate(): boolean {
    const next: { email?: string; password?: string } = {};
    const e = emailError(email);
    if (e) next.email = t(e);
    if (password.length === 0) next.password = t("valid.required");
    setFieldError(next);
    setTouched({ email: true, password: true });
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    if (!validate()) return;

    inFlight.current = true;
    setPending(true);
    setFailure(null);

    try {
      const res = await authApi.login(email.trim(), password);
      setSession(res);

      // Success is a transition, not a toast. The plate lifts and dims while the next
      // route resolves, so the two pages feel continuous rather than swapped.
      setLeaving(true);
      const needsOnboarding = res.userType !== "Admin" && !res.hasOnboarded;
      const home =
        res.userType === "Investor"
          ? "/invest"
          : res.userType === "Admin"
            ? "/admin"
            : "/dashboard";
      router.replace(needsOnboarding ? "/onboarding" : home);
    } catch (err) {
      const f = classify(err);
      setFailure(f);
      // One restrained lateral movement. Not a jitter — a refusal.
      if (!reduce) {
        shake.start({
          x: [0, -7, 6, -3, 0],
          transition: { duration: 0.42, ease: "easeInOut" },
        });
      }
      // Wrong credentials means try again here. The other kinds mean go somewhere else,
      // so only this one clears the passcode and takes focus back to the form.
      if (f.kind === "credentials") {
        setPassword("");
        emailRef.current?.focus();
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  /** Any edit clears the banner — the last attempt is no longer what they are doing. */
  function onEdit() {
    if (failure) setFailure(null);
  }

  const emailInvalid = Boolean(touched.email && fieldError.email);
  const passwordInvalid = Boolean(touched.password && fieldError.password);

  return (
    <AuthStage>
      <motion.div
        animate={shake}
        style={{
          opacity: leaving ? 0 : 1,
          transform: leaving ? "translateY(-10px)" : "none",
        }}
        className="transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <h2
          className="text-[1.6rem] font-bold leading-tight"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {t("login.title")}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          {t("login.subtitle")}
        </p>

        {/* An account-state failure is persistent context with a way out, so it is an
            Alert rather than a toast — a toast would vanish before someone reading an
            unfamiliar message had finished it. */}
        <AlertSlot show={failure !== null}>
          {failure && (
            <Alert
              className="mt-6"
              live="assertive"
              tone={failure.kind === "credentials" ? "error" : "warning"}
              title={t(`login.fail.${failure.kind}.title`)}
              action={
                failure.kind === "unverified" ? (
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                    data-cursor="hover"
                    className="inline-flex min-h-9 items-center rounded-full border border-primary/40 bg-primary/10 px-3.5 text-[11.5px] font-semibold outline-none transition-colors hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/25"
                  >
                    {t("login.fail.unverified.action")}
                  </Link>
                ) : failure.kind === "credentials" ? (
                  <Link
                    href="/forgot-password"
                    data-cursor="hover"
                    className="link-underline text-[11.5px] text-foreground transition-colors hover:text-primary"
                  >
                    {t("login.trouble")}
                  </Link>
                ) : failure.kind === "suspended" ? (
                  <Link
                    href="/help#contact"
                    data-cursor="hover"
                    className="link-underline text-[11.5px] text-foreground transition-colors hover:text-primary"
                  >
                    {t("help.contact.nav")}
                  </Link>
                ) : null
              }
            >
              {t(`login.fail.${failure.kind}.body`)}
            </Alert>
          )}
        </AlertSlot>

        <form onSubmit={onSubmit} noValidate className="mt-9 space-y-6">
          <AuthField
            ref={emailRef}
            label={t("login.email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            // readOnly rather than disabled while submitting: the value stays legible
            // and selectable, and the tab order does not change under the user.
            readOnly={pending}
            value={email}
            state={emailInvalid ? "invalid" : "default"}
            message={fieldError.email}
            onChange={(e) => {
              setEmail(e.target.value);
              onEdit();
              // Corrections track as you type, but only once the field has already been
              // judged — never on the first keystroke.
              if (touched.email) {
                const err = emailError(e.target.value);
                setFieldError((p) => ({ ...p, email: err ? t(err) : undefined }));
              }
            }}
            onBlur={() => {
              setTouched((p) => ({ ...p, email: true }));
              const err = emailError(email);
              setFieldError((p) => ({ ...p, email: err ? t(err) : undefined }));
            }}
          />

          <AuthField
            label={t("login.password")}
            reveal
            autoComplete="current-password"
            readOnly={pending}
            value={password}
            state={passwordInvalid ? "invalid" : "default"}
            message={fieldError.password}
            labelAction={
              <Link
                href="/forgot-password"
                data-cursor="hover"
                className="rounded-full text-[11.5px] text-muted-foreground outline-none transition-colors duration-300 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                {t("login.forgot")}
              </Link>
            }
            onChange={(e) => {
              setPassword(e.target.value);
              onEdit();
              if (touched.password && e.target.value.length > 0) {
                setFieldError((p) => ({ ...p, password: undefined }));
              }
            }}
            onBlur={() => setTouched((p) => ({ ...p, password: true }))}
          />

          <AuthSubmit
            pending={pending}
            label={t("login.submit")}
            pendingLabel={t("login.submitting")}
            className="pt-2"
          />
        </form>

        <p className="mt-9 border-t border-border/60 pt-7 text-center text-[13px] text-muted-foreground">
          {t("login.noAccount")}{" "}
          <Link
            href="/register"
            data-cursor="hover"
            className="link-underline font-medium text-foreground transition-colors hover:text-primary"
          >
            {t("login.signupLink")}
          </Link>
        </p>
      </motion.div>
    </AuthStage>
  );
}
