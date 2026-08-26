"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Check, Link2 } from "lucide-react";
import { LinkedinIcon } from "@/components/brand/social-icons";
import { PillButton } from "@/components/ui/pill-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DepthLayer, DepthScene, useSpecular } from "@/components/motion/depth-scene";
import { PROJECT_CATEGORIES, categoryLabelKey } from "@/lib/config/categories";
import { usersApi, type UpdateProfileInput } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const STEPS = 3;

/**
 * The first-run flow, as a plate held inside a depth scene.
 *
 * Three steps rather than one screen: a welcome that names the person, one step
 * that differs by role, and a profile step. The split is not ceremony — each
 * step asks for one thing, which is the only way the profile step gets answered
 * at all. Skipping stays available on every step because a first run must never
 * be a wall.
 *
 * Completion is recorded on the account (`/api/users/me/onboarded`), not in
 * localStorage: this used to be a per-browser fact, so the same person met this
 * page again on every new device.
 */
export default function OnboardingPage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const user = useAuthStore((s) => s.user);
  const isInvestor = user?.userType === "Investor";

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [selected, setSelected] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // The pointer drives two things at once: the scene's tilt (inside DepthScene)
  // and the specular sweep below, so the plate reads as a surface catching light
  // rather than a box being rotated.
  const stageRef = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 70, damping: 22, mass: 0.7 });
  const sy = useSpring(py, { stiffness: 70, damping: 22, mass: 0.7 });
  const specular = useSpecular(sx, sy);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const complete = useMutation({
    mutationFn: async () => {
      const payload: UpdateProfileInput = {};
      if (isInvestor && selected.length > 0) payload.preferredIndustries = selected.join(", ");
      if (bio.trim()) payload.briefBio = bio.trim();
      if (website.trim()) payload.websiteUrl = website.trim();
      if (linkedin.trim()) payload.linkedinUrl = linkedin.trim();
      if (avatar) payload.avatar = avatar;

      // Only touch the profile when the person actually gave us something.
      if (Object.keys(payload).length > 0) {
        await usersApi.updateMe(payload);
      }
      await usersApi.markOnboarded();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onPointerMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  async function finish(destination?: string) {
    if (!user) return;
    try {
      await complete.mutateAsync();
    } catch {
      return; // toast already surfaced it; keep them on the step they were on.
    }
    router.replace(destination ?? (isInvestor ? "/invest" : "/dashboard"));
  }

  if (!user) return null;

  const last = step === STEPS - 1;

  return (
    <div
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden px-4 py-12 sm:px-6"
    >
      <Guilloche />

      <DepthScene className="w-full max-w-3xl" intensity={0.55} perspective={1500}>
        <DepthLayer z={-70} className="pointer-events-none absolute inset-0">
          {/* The plate's own shadow, cast onto the paper behind it. */}
          <div className="absolute inset-x-8 top-10 bottom-0 bg-foreground/[0.07] blur-3xl" />
        </DepthLayer>

        <DepthLayer z={0}>
          <div
            className="relative border border-primary/25 bg-card/90 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.55)] backdrop-blur-sm"
            style={{ clipPath: "var(--chamfer-lg)" }}
          >
            {!reduce && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{ background: specular }}
              />
            )}

            <div className="relative z-[2] p-7 sm:p-11">
              <ProgressRail step={step} rtl={rtl} t={t} />

              <div className="mt-9 min-h-[19rem] sm:min-h-[21rem]">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={step}
                    custom={direction}
                    initial={
                      reduce
                        ? { opacity: 0 }
                        : { opacity: 0, z: -90, y: 22 * direction, filter: "blur(6px)" }
                    }
                    animate={{ opacity: 1, z: 0, y: 0, filter: "blur(0px)" }}
                    exit={
                      reduce
                        ? { opacity: 0 }
                        : { opacity: 0, z: -70, y: -18 * direction, filter: "blur(5px)" }
                    }
                    transition={{ duration: reduce ? 0.2 : 0.62, ease: EASE }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {step === 0 && <WelcomeStep name={user.userName} isInvestor={isInvestor} t={t} />}

                    {step === 1 &&
                      (isInvestor ? (
                        <InterestsStep
                          selected={selected}
                          onToggle={(category) =>
                            setSelected((prev) =>
                              prev.includes(category)
                                ? prev.filter((i) => i !== category)
                                : [...prev, category]
                            )
                          }
                          t={t}
                        />
                      ) : (
                        <PathStep t={t} />
                      ))}

                    {step === 2 && (
                      <ProfileStep
                        name={user.userName}
                        preview={avatarPreview}
                        bio={bio}
                        website={website}
                        linkedin={linkedin}
                        onAvatar={(file) => {
                          if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                          setAvatar(file);
                          setAvatarPreview(file ? URL.createObjectURL(file) : null);
                        }}
                        onBio={setBio}
                        onWebsite={setWebsite}
                        onLinkedin={setLinkedin}
                        t={t}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border/60 pt-6">
                <PillButton
                  size="lg"
                  disabled={complete.isPending}
                  onClick={() => {
                    if (!last) return go(step + 1);
                    finish(isInvestor ? undefined : "/my-projects/new");
                  }}
                >
                  {complete.isPending
                    ? t("onboard.saving")
                    : last
                      ? isInvestor
                        ? t("onboard.finish")
                        : t("onboard.founder.cta")
                      : t("onboard.next")}
                </PillButton>

                {step > 0 && (
                  <button
                    type="button"
                    data-cursor="hover"
                    disabled={complete.isPending}
                    onClick={() => go(step - 1)}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    {t("onboard.back")}
                  </button>
                )}

                <button
                  type="button"
                  data-cursor="hover"
                  disabled={complete.isPending}
                  onClick={() => finish()}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 ms-auto"
                >
                  {t("onboard.skip")}
                </button>
              </div>
            </div>
          </div>
        </DepthLayer>
      </DepthScene>
    </div>
  );
}

/**
 * Engraved security paper behind the plate — the guilloché of a share
 * certificate, drawn with two repeating gradients so it costs no bytes and no
 * raster. Masked to a soft ellipse so it never becomes wallpaper.
 */
function Guilloche() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-40"
      style={{
        backgroundImage: `
          repeating-radial-gradient(circle at 50% 42%, color-mix(in oklab, var(--primary) 22%, transparent) 0 1px, transparent 1px 13px),
          repeating-linear-gradient(115deg, color-mix(in oklab, var(--bronze) 12%, transparent) 0 1px, transparent 1px 22px)
        `,
        maskImage: "radial-gradient(ellipse 65% 55% at 50% 45%, #000 0%, transparent 72%)",
      }}
    />
  );
}

/** Gold hairline rail with the step numerals — the only progress affordance. */
function ProgressRail({
  step,
  rtl,
  t,
}: {
  step: number;
  rtl: boolean;
  t: (k: string) => string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        {Array.from({ length: STEPS }).map((_, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex flex-1 items-center gap-3">
              <span
                className={cn(
                  "font-numeric grid size-7 shrink-0 place-items-center rounded-full border text-[0.8rem] transition-colors duration-500",
                  active && "border-primary bg-primary/12 text-primary",
                  done && "border-primary/45 bg-primary/45 text-primary-foreground",
                  !active && !done && "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              {i < STEPS - 1 && (
                <span className="relative h-px flex-1 bg-border">
                  <motion.span
                    className="absolute inset-y-0 start-0 bg-primary/60"
                    initial={false}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.55, ease: EASE }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p
        className={cn(
          "mt-4 text-xs text-muted-foreground",
          !rtl && "uppercase tracking-[0.22em]"
        )}
      >
        {t("onboard.step.of").replace("{n}", String(step + 1)).replace("{total}", String(STEPS))}
      </p>
    </div>
  );
}

function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.08] text-balance"
      style={{ fontFamily: "var(--font-heading)" }}
    >
      {children}
    </h1>
  );
}

function WelcomeStep({
  name,
  isInvestor,
  t,
}: {
  name: string;
  isInvestor: boolean;
  t: (k: string) => string;
}) {
  return (
    <div>
      <StepHeading>{t("onboard.welcome").replace("{name}", name)}</StepHeading>
      <p className="mt-5 max-w-[62ch] text-[0.95rem] leading-relaxed text-muted-foreground">
        {isInvestor ? t("onboard.investor.body") : t("onboard.founder.body")}
      </p>
      <p className="mt-8 text-sm text-primary">{t("onboard.welcome.time")}</p>
    </div>
  );
}

function InterestsStep({
  selected,
  onToggle,
  t,
}: {
  selected: string[];
  onToggle: (category: string) => void;
  t: (k: string) => string;
}) {
  return (
    <div>
      <StepHeading>{t("onboard.investor.pick")}</StepHeading>
      <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-relaxed text-muted-foreground">
        {t("onboard.investor.why")}
      </p>

      {/* The same closed category list a founder picks from — sourced statically
          rather than from live project data, which used to mean the list an
          investor saw here was whatever happened to already exist in the
          database (empty for a platform with nothing in it yet). */}
      <div className="mt-7 flex flex-wrap gap-2.5">
        {PROJECT_CATEGORIES.map((key) => {
          const active = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              data-cursor="hover"
              aria-pressed={active}
              onClick={() => onToggle(key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                active
                  ? "border-primary bg-primary/12 text-foreground shadow-[0_6px_18px_-12px_var(--primary)]"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              {t(categoryLabelKey(key))}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {selected.length > 0
          ? t("onboard.investor.count").replace("{n}", String(selected.length))
          : t("onboard.investor.none")}
      </p>
    </div>
  );
}

/**
 * A founder's first need is a listing, not a preference — so this step states
 * the path rather than asking a question. A rail with numerals, not three
 * matching cards: the three things are a sequence, and a grid would hide that.
 */
function PathStep({ t }: { t: (k: string) => string }) {
  return (
    <div>
      <StepHeading>{t("onboard.founder.path")}</StepHeading>

      <ol className="mt-7 space-y-6">
        {FOUNDER_STEPS.map((s, i) => (
          <li key={s.titleKey} className="relative flex gap-5 ps-1">
            <div className="flex flex-col items-center">
              <span className="font-numeric grid size-8 shrink-0 place-items-center rounded-full border border-primary/35 text-sm text-primary">
                {i + 1}
              </span>
              {i < FOUNDER_STEPS.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-gradient-to-b from-primary/35 to-transparent" />
              )}
            </div>
            <div className="min-w-0 pb-1">
              <p className="text-[0.98rem] font-semibold">{t(s.titleKey)}</p>
              <p className="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                {t(s.bodyKey)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProfileStep({
  name,
  preview,
  bio,
  website,
  linkedin,
  onAvatar,
  onBio,
  onWebsite,
  onLinkedin,
  t,
}: {
  name: string;
  preview: string | null;
  bio: string;
  website: string;
  linkedin: string;
  onAvatar: (file: File | null) => void;
  onBio: (v: string) => void;
  onWebsite: (v: string) => void;
  onLinkedin: (v: string) => void;
  t: (k: string) => string;
}) {
  return (
    <div>
      <StepHeading>{t("onboard.profile.title")}</StepHeading>
      <p className="mt-4 max-w-[62ch] text-[0.95rem] leading-relaxed text-muted-foreground">
        {t("onboard.profile.body")}
      </p>

      <div className="mt-7 flex flex-col gap-6 sm:flex-row sm:items-start">
        <label
          data-cursor="hover"
          className="group relative grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-primary/30 bg-primary/[0.05] transition-colors hover:border-primary/60 focus-within:ring-3 focus-within:ring-ring/40"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={name} className="size-full object-cover" />
          ) : (
            <Camera className="size-6 text-primary/70" strokeWidth={1.5} />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-foreground/70 py-1 text-center text-[0.65rem] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
            {t("onboard.profile.avatar")}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/bmp"
            className="sr-only"
            onChange={(e) => onAvatar(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <label htmlFor="ob-bio" className="text-sm font-medium">
              {t("onboard.profile.bio")}
            </label>
            <Textarea
              id="ob-bio"
              value={bio}
              maxLength={500}
              onChange={(e) => onBio(e.target.value)}
              placeholder={t("onboard.profile.bio.ph")}
              className="mt-2 min-h-24"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ob-site" className="sr-only">
                {t("onboard.profile.website")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-input px-2.5">
                <Link2 className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <Input
                  id="ob-site"
                  value={website}
                  inputMode="url"
                  onChange={(e) => onWebsite(e.target.value)}
                  placeholder={t("onboard.profile.website")}
                  className="border-0 px-0 focus-visible:ring-0"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ob-li" className="sr-only">
                {t("onboard.profile.linkedin")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-input px-2.5">
                <LinkedinIcon className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  id="ob-li"
                  value={linkedin}
                  inputMode="url"
                  onChange={(e) => onLinkedin(e.target.value)}
                  placeholder={t("onboard.profile.linkedin")}
                  className="border-0 px-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FOUNDER_STEPS = [
  { titleKey: "onboard.founder.step1.title", bodyKey: "onboard.founder.step1.body" },
  { titleKey: "onboard.founder.step2.title", bodyKey: "onboard.founder.step2.body" },
  { titleKey: "onboard.founder.step3.title", bodyKey: "onboard.founder.step3.body" },
];
