"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { CalendarDays, ExternalLink, Globe } from "lucide-react";
import { Guilloche } from "@/components/auth/guilloche";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { InvestmentMandate } from "@/components/profile/investment-mandate";
import { DepthLayer, DepthScene } from "@/components/motion/depth-scene";
import {
  FOUNDER_AVATAR_TRANSITION,
  tagVentureMorphTarget,
} from "@/lib/browse/view-transition";
import { PillButton } from "@/components/ui/pill-button";
import { FollowButton } from "@/components/profile/follow-button";
import { FollowListModal, type FollowMode } from "@/components/profile/follow-list-modal";
import { MessageLauncher } from "@/components/messages/message-launcher";
import { avatarUrl, coverUrl } from "@/lib/api/users";
import { categoryOrRawLabel } from "@/lib/config/categories";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { PublicProfileDetail } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

// Motes suspended over the cover at different depths. `z` drives how far each
// one travels against the scroll, so the field separates into foreground and
// background as the page moves — parallax the reader causes, rather than five
// independent loops running forever whether anyone is looking or not.
const DOTS = [
  { l: "12%", t: "28%", s: 5, z: 1 },
  { l: "68%", t: "20%", s: 4, z: 0.55 },
  { l: "44%", t: "58%", s: 3, z: 0.3 },
  { l: "84%", t: "52%", s: 5, z: 0.85 },
  { l: "28%", t: "70%", s: 3, z: 0.45 },
];

/** One mote of the cover's depth field, displaced by scroll in proportion to its depth. */
function Mote({
  dot,
  progress,
}: {
  dot: (typeof DOTS)[number];
  progress: MotionValue<number>;
}) {
  const y = useTransform(progress, [0, 1], [0, -140 * dot.z]);
  const opacity = useTransform(progress, [0, 0.55, 1], [0.18, 0.5, 0]);
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute rounded-full bg-primary/40 blur-[0.5px]"
      style={{ left: dot.l, top: dot.t, width: dot.s, height: dot.s, y, opacity }}
    />
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Big circular avatar over the cover — image with a graceful initials fallback. */
function HeroAvatar({ id, name }: { id: number; name: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Receives the founder avatar travelling in from a venture page, so arriving
  // here reads as following a person rather than loading a new document.
  useEffect(() => {
    tagVentureMorphTarget(ref.current, FOUNDER_AVATAR_TRANSITION);
  }, []);

  return (
    <span
      ref={ref}
      className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] ring-4 ring-card sm:size-32"
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 120% at 25% 15%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 60%), radial-gradient(120% 120% at 100% 100%, color-mix(in oklab, var(--bronze) 26%, transparent), transparent 60%)",
        }}
      />
      {!failed ? (
        <img
          src={avatarUrl(id)}
          alt={name}
          onError={() => setFailed(true)}
          className="relative h-full w-full object-cover"
        />
      ) : (
        <span
          className="relative text-2xl text-primary sm:text-3xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** Website/LinkedIn/X row — shown only when at least one is set. */
function SocialLinks({ profile }: { profile: PublicProfileDetail }) {
  const links = [
    { href: profile.websiteUrl, icon: Globe, label: "Website" },
    { href: profile.linkedinUrl, icon: ExternalLink, label: "LinkedIn" },
    { href: profile.twitterUrl, icon: ExternalLink, label: "X" },
  ].filter((l) => l.href);

  if (links.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href!}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="hover"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <l.icon className="size-3.5" strokeWidth={1.75} />
          {l.label}
        </a>
      ))}
    </div>
  );
}

function Stat({
  value,
  label,
  onClick,
  delay,
}: {
  value: number;
  label: string;
  onClick?: () => void;
  delay: number;
}) {
  const inner = (
    <>
      <AnimatedNumber
        value={value}
        format={(v) => String(v)}
        delay={delay}
        className="font-numeric text-2xl leading-none text-foreground transition-colors duration-300 group-hover/stat:text-primary sm:text-[1.7rem]"
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  );

  const base = "group/stat flex items-baseline gap-2.5";
  if (onClick) {
    return (
      <button
        type="button"
        data-cursor="hover"
        onClick={onClick}
        className={cn(
          base,
          "rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        )}
      >
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

export function ProfileHero({ profile }: { profile: PublicProfileDetail }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion();
  const me = useAuthStore((s) => s.user);
  // Trust the server, but fall back to the client identity: a hard reload can
  // fetch the profile before the session bootstrap attaches the bearer, so the
  // server may report isMe=false on your own page.
  const isMe = profile.isMe || me?.id === profile.id;

  const [listOpen, setListOpen] = useState(false);
  const [listMode, setListMode] = useState<FollowMode>("followers");
  function openList(mode: FollowMode) {
    setListMode(mode);
    setListOpen(true);
  }

  const coverRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: coverRef,
    offset: ["start start", "end start"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 26, mass: 0.4 });
  const coverY = useTransform(smooth, [0, 1], ["0%", "24%"]);

  const roleKey =
    profile.userType === "Innovator"
      ? "profile.role.innovator"
      : profile.userType === "Admin"
        ? "profile.role.admin"
        : "profile.role.investor";

  const joined =
    profile.joinedAtUtc &&
    new Intl.DateTimeFormat(rtl ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date(profile.joinedAtUtc));

  const isInvestor = profile.userType === "Investor";
  const thirdStat = isInvestor
    ? { value: profile.backedCount, label: t("profile.stat.backed") }
    : { value: profile.projectsCount, label: t("profile.stat.ventures") };

  return (
    <section className="relative">
      {/* ============ Cover band ============ */}
      <div
        ref={coverRef}
        className="relative h-[52svh] min-h-[440px] w-full overflow-hidden bg-secondary"
      >
        <motion.div
          style={reduce ? undefined : { y: coverY }}
          className="absolute inset-0 scale-[1.12]"
        >
          {profile.hasCover ? (
            <img src={coverUrl(profile.id)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(120% 120% at 12% 0%, color-mix(in oklab, var(--primary) 24%, var(--card)), var(--card) 70%), radial-gradient(100% 100% at 100% 100%, color-mix(in oklab, var(--bronze) 28%, transparent), transparent 60%)",
              }}
            >
              <motion.div
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration: 260, ease: "linear", repeat: Infinity }}
                className="absolute -end-40 -top-40 h-[620px] w-[620px]"
              >
                <Guilloche className="h-full w-full text-primary/[0.16] dark:text-primary/[0.10]" />
              </motion.div>
            </div>
          )}
        </motion.div>

        {/* Dynamic lighting — two slow-drifting ambient blobs */}
        {!reduce && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-[4%] top-[8%] h-[62%] w-[46%] rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
              }}
              animate={{ x: ["-8%", "12%", "-8%"], y: ["-6%", "10%", "-6%"] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute right-[6%] top-[18%] h-[56%] w-[42%] rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--bronze) 20%, transparent), transparent 70%)",
              }}
              animate={{ x: ["6%", "-10%", "6%"], y: ["4%", "-8%", "4%"] }}
              transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Depth field — each mote rides the scroll at its own rate. */}
        {!reduce &&
          DOTS.map((d, i) => (
            <Mote key={i} dot={d} progress={smooth} />
          ))}

        {/* Grain */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.10] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Mask-blur + fade so the cover dissolves softly into the page/panel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 backdrop-blur-[5px] [mask-image:linear-gradient(to_bottom,transparent,#000_80%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-background"
        />
      </div>

      {/* ============ Glass identity panel (overlaps the cover) ============ */}
      <DepthScene intensity={0.5} perspective={1600} className="mx-auto max-w-6xl px-5 sm:px-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          className="relative -mt-24 sm:-mt-28"
        >
          {/* Decorative glass surface — clipped to the rounded shape. Kept as an
              absolute sibling (not a parent) of the content below so the avatar
              can overlap its top edge without being clipped along with it. */}
          <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/70 shadow-[0_40px_120px_-45px_rgba(0,0,0,0.6)] ring-1 ring-white/5 backdrop-blur-2xl">
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, color-mix(in oklab, var(--primary) 7%, transparent), transparent)",
              }}
            />
          </div>

          <div className="relative p-6 sm:p-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-5">
                {/* The face sits furthest forward — it is the one thing on a
                    profile that should feel physically present. */}
                <DepthLayer z={46} className="-mt-16 sm:-mt-24">
                  <HeroAvatar id={profile.id} name={profile.userName} />
                </DepthLayer>

                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={cn(
                        "rounded-full border border-primary/40 bg-primary/[0.07] px-3 py-1 text-[11px] text-primary",
                        rtl ? "" : "uppercase tracking-[0.18em]"
                      )}
                    >
                      {t(roleKey)}
                    </span>
                    {joined && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                        <CalendarDays className="size-3.5" strokeWidth={1.75} />
                        {t("profile.joined")} <span className="font-numeric">{joined}</span>
                      </span>
                    )}
                  </div>

                  <span className={cn("mt-3 block overflow-hidden", rtl && "-my-2 py-2")}>
                    <motion.h1
                      initial={reduce ? false : { y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 1, delay: 0.15, ease: EASE }}
                      className={cn(
                        "block truncate text-3xl font-bold sm:text-[2.75rem]",
                        rtl ? "leading-[1.3]" : "tracking-[-0.01em] leading-[1.08]"
                      )}
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      {profile.userName}
                    </motion.h1>
                  </span>
                </div>
              </div>

              <div className="shrink-0 sm:pt-1">
                {isMe ? (
                  <PillButton href="/settings/profile" variant="outline" showArrow={false}>
                    {t("profile.edit")}
                  </PillButton>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <FollowButton userId={profile.id} />
                    <MessageLauncher userId={profile.id} variant="ghost" />
                  </div>
                )}
              </div>
            </div>

            {profile.briefBio && (
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-foreground/85">
                {profile.briefBio}
              </p>
            )}

            <SocialLinks profile={profile} />

            {isInvestor && <InvestmentMandate profile={profile} />}

            {isInvestor && profile.preferredIndustries && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.preferredIndustries
                  .split(",")
                  .map((i) => i.trim())
                  .filter(Boolean)
                  .map((industry) => (
                    <span
                      key={industry}
                      className="rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-xs text-primary/90"
                    >
                      {categoryOrRawLabel(industry, t)}
                    </span>
                  ))}
              </div>
            )}

            {/* Stats — followers / following open the list; the third is contextual */}
            <div className="mt-7 flex flex-wrap items-center gap-x-9 gap-y-4 border-t border-border/60 pt-6">
              <Stat
                value={profile.followersCount}
                label={t("profile.followers")}
                onClick={() => openList("followers")}
                delay={0.25}
              />
              <Stat
                value={profile.followingCount}
                label={t("profile.followingCount")}
                onClick={() => openList("following")}
                delay={0.32}
              />
              <Stat value={thirdStat.value} label={thirdStat.label} delay={0.39} />
            </div>
          </div>
        </motion.div>
      </DepthScene>

      <FollowListModal
        userId={profile.id}
        mode={listMode}
        open={listOpen}
        onOpenChange={setListOpen}
      />
    </section>
  );
}
