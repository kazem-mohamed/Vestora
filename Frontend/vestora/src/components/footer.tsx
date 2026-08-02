"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Guilloche } from "@/components/auth/guilloche";
import { Logo } from "@/components/brand/logo";
import { Magnetic } from "@/components/motion/magnetic";
import { staggerContainer, staggerItem } from "@/components/motion/reveal";
import { SOCIAL_LINKS } from "@/lib/config/social";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * What Vestora actually does, in four statements.
 *
 * This replaced four words in four bordered cells with an icon above each — which was a
 * card grid, and the footer's own composition rule two hundred lines below says
 * "asymmetric, never equal columns". It was also four claims rather than four facts:
 * "Curated ventures" and "Trusted connections" are the kind of thing every marketplace
 * asserts and none of them can show.
 *
 * Each line here is something the product can be held to. "No money moves through
 * Vestora" is in the terms. "Every listing is reviewed" is what moderation does. They
 * read as the fine print on a certificate, which is the register the whole footer is
 * already in — so the numerals carry them instead of icons, and there is no panel.
 */
/**
 * Two, and large.
 *
 * The first attempt swapped four bordered icon-cells for four columns of small grey
 * text. That fixed the card-grid problem and created a new one: at 13px in muted
 * foreground, four columns read as fine print — legally reassuring, visually inert, and
 * easy to scroll past without registering a word.
 *
 * So the count comes down and the type goes up. Two statements at display size, set
 * against each other rather than in a row, is the shape that actually gets read. The
 * pair is chosen to cover both halves of the honesty claim: what Vestora does not do,
 * and what it does. The other two facts were true but redundant at this scale — they
 * still appear in the terms, which is where the full account belongs.
 */
const PILLARS: { key: string }[] = [
  { key: "foot.pillar.fee" },
  { key: "foot.pillar.reviewed" },
];

/**
 * The two doors.
 *
 * Everything above this point addresses founders and investors together —
 * `How it works` even splits them into two columns and explains each side
 * properly — and then every CTA on the page hands both of them the same
 * button. Sixteen CTA links, one shape. This is the first and only place the
 * reader is asked which one they are, and it is the right place to ask: after
 * they have finished reading and decided to act.
 *
 * Both routes land on /register, which is correct — the account type is
 * chosen there. What changes is that the reader arrives having already been
 * addressed as the thing they are.
 */
const DOORS = [
  { key: "land.cta.founder", desc: "land.cta.founder.d", href: "/register?as=founder" },
  { key: "land.cta.investor", desc: "land.cta.investor.d", href: "/register?as=investor" },
] as const;

/** A footer link: gold underline sweep + an arrow that slides out on hover. */
function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-cursor="hover"
      className="group/fl inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
    >
      <span className="link-underline transition-transform duration-300 group-hover/fl:translate-x-0.5 group-hover/fl:rtl:-translate-x-0.5">
        {children}
      </span>
      <ArrowUpRight className="size-3.5 -translate-x-1 rtl:translate-x-1 rtl:rotate-[-90deg] opacity-0 transition-all duration-300 group-hover/fl:translate-x-0 group-hover/fl:opacity-100" />
    </Link>
  );
}

/** [01]-style numbered group header, echoing SectionLabel's rhythm at footer scale. */
function GroupHeading({ index, children }: { index: number; children: React.ReactNode }) {
  const { locale } = useLocale();
  const rtl = locale === "ar";
  return (
    <p className="flex items-center gap-2.5 text-xs text-primary">
      <span className="font-numeric">[{String(index).padStart(2, "0")}]</span>
      <span className={rtl ? "" : "uppercase tracking-[0.24em]"}>{children}</span>
    </p>
  );
}

/** Social glyph — lifts, scales, and lights a gold ring on hover. */
function SocialIcon({
  name,
  href,
  icon: Icon,
}: {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="hover"
      aria-label={name}
      title={name}
      className="group/soc relative grid size-9 place-items-center rounded-full text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-primary"
    >
      <span className="absolute inset-0 scale-75 rounded-full border border-primary/0 opacity-0 transition-all duration-300 group-hover/soc:scale-100 group-hover/soc:border-primary/40 group-hover/soc:opacity-100" />
      <Icon className="size-[17px] transition-transform duration-300 group-hover/soc:scale-110" />
    </a>
  );
}

/** Back-to-top: a magnetic disc wrapped in a live scroll-progress ring. */
function BackToTop({ label, reduce }: { label: string; reduce: boolean | null }) {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const R = 17;
  const C = 2 * Math.PI * R;
  const dash = useTransform(smooth, (v) => C * (1 - v));

  return (
    <Magnetic strength={0.4}>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
        aria-label={label}
        title={label}
        className="group/top relative grid size-11 place-items-center rounded-full text-muted-foreground transition-colors duration-300 hover:text-primary"
      >
        <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90">
          <circle cx="20" cy="20" r={R} fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <motion.circle
            cx="20"
            cy="20"
            r={R}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={C}
            style={reduce ? { strokeDashoffset: 0 } : { strokeDashoffset: dash }}
          />
        </svg>
        <ArrowUp className="size-4 transition-transform duration-300 group-hover/top:-translate-y-0.5" />
      </button>
    </Magnetic>
  );
}

/**
 * Site-wide closing chrome. `variant="stage"` is the full cinematic close for
 * the landing page (dominant Guilloché medallion + ambient light + a
 * cursor-reactive spotlight in place of the old looping video, no asset
 * dependency); `variant="compact"` is the quiet band carried on every other
 * public surface. Same content model, same component, so the CTA can be
 * toggled on/off (`showCta`) without touching layout code.
 */
export function Footer({
  variant = "compact",
  showCta = false,
}: {
  variant?: "stage" | "compact";
  showCta?: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion();
  const user = useAuthStore((s) => s.user);
  const track = rtl ? "" : "uppercase tracking-[0.3em]";

  const isStage = variant === "stage";

  // Cursor-reactive depth (stage only): the medallion drifts a few px against
  // the pointer and a soft gold spotlight follows it — parallax + light that
  // add depth without noise. All driven by motion values outside React render.
  const rootRef = useRef<HTMLElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(50);
  const driftX = useSpring(pointerX, { stiffness: 60, damping: 20, mass: 0.6 });
  const driftY = useSpring(pointerY, { stiffness: 60, damping: 20, mass: 0.6 });
  const spotXs = useSpring(spotX, { stiffness: 120, damping: 30 });
  const spotYs = useSpring(spotY, { stiffness: 120, damping: 30 });
  const medallionX = useTransform(driftX, (v) => v * 24);
  const medallionY = useTransform(driftY, (v) => v * 24);
  const spotlight = useMotionTemplate`radial-gradient(560px circle at ${spotXs}% ${spotYs}%, color-mix(in oklab, var(--primary) 7%, transparent), transparent 62%)`;

  function onPointerMove(e: React.PointerEvent) {
    if (!isStage || reduce || !rootRef.current) return;
    const r = rootRef.current.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    const ry = (e.clientY - r.top) / r.height;
    pointerX.set(rx * 2 - 1);
    pointerY.set(ry * 2 - 1);
    spotX.set(rx * 100);
    spotY.set(ry * 100);
  }

  // Three groups, because the footer now carries a real public architecture rather than
  // four links and a duplicate. "Privacy" used to point at /terms — two different
  // promises behind one document, which is the kind of detail that quietly costs trust.
  const exploreLinks = [
    { label: t("nav.browse"), href: "/projects" },
    { label: t("land.nav.how"), href: "/how-it-works" },
    { label: t("land.nav.principles"), href: "/#principles" },
  ];

  const companyLinks = [
    { label: t("about.nav"), href: "/about" },
    { label: t("help.nav"), href: "/help" },
    { label: t("help.contact.nav"), href: "/help#contact" },
  ];

  // Risk sits in the footer's legal group AND beside the moment money is committed.
  // Someone should not have to come here to find it, but they should find it here too.
  const legalLinks = [
    { label: t("register.terms.link"), href: "/legal/terms" },
    { label: t("land.foot.privacy"), href: "/legal/privacy" },
    { label: t("legal.risk.nav"), href: "/legal/risk" },
    { label: t("legal.allDocuments"), href: "/legal" },
  ];

  const accountHref = user
    ? user.userType === "Investor"
      ? "/invest"
      : user.userType === "Admin"
        ? "/admin"
        : "/dashboard"
    : "/login";
  const accountLabel = user
    ? user.userType === "Investor"
      ? t("nav.portfolio")
      : user.userType === "Admin"
        ? t("nav.admin")
        : t("nav.dashboard")
    : t("nav.login");

  return (
    <footer
      ref={rootRef}
      onPointerMove={onPointerMove}
      className={cn(
        "relative overflow-hidden border-t border-border/60 bg-card/40",
        isStage &&
          "rounded-t-[2.5rem] shadow-[0_-28px_60px_-32px_rgba(0,0,0,0.45)] md:rounded-t-[3.5rem] border-t-0"
      )}
    >
      {/* ===== Background: layered depth, no video asset ===== */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Primary medallion — rotates, and (stage) drifts with the cursor. */}
        <motion.div
          style={isStage && !reduce ? { x: medallionX, y: medallionY } : undefined}
          className="absolute inset-0"
        >
          <motion.div
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 300, ease: "linear", repeat: Infinity }}
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              isStage ? "size-[1100px]" : "size-[620px]"
            )}
          >
            <Guilloche
              className={cn(
                "h-full w-full",
                isStage
                  ? "text-primary/[0.09] dark:text-primary/[0.06]"
                  : "text-primary/[0.05] dark:text-primary/[0.04]"
              )}
            />
          </motion.div>
        </motion.div>

        {/* Stage-only: a second, fainter medallion turning the other way adds
            real parallax depth; drifting light blobs; and a cursor spotlight. */}
        {isStage && (
          <>
            {!reduce && (
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 460, ease: "linear", repeat: Infinity }}
                className="absolute left-1/2 top-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2"
              >
                <Guilloche className="h-full w-full text-bronze/[0.05] dark:text-bronze/[0.04]" />
              </motion.div>
            )}
            {!reduce && (
              <>
                <motion.div
                  className="absolute left-[8%] top-[10%] h-[50%] w-[38%] rounded-full blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)",
                  }}
                  animate={{ x: ["-6%", "8%", "-6%"], y: ["-4%", "8%", "-4%"] }}
                  transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute right-[6%] bottom-[8%] h-[46%] w-[36%] rounded-full blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--bronze) 18%, transparent), transparent 70%)",
                  }}
                  animate={{ x: ["6%", "-8%", "6%"], y: ["4%", "-6%", "4%"] }}
                  transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div className="absolute inset-0" style={{ background: spotlight }} />
              </>
            )}
          </>
        )}

        <div className="film-grain absolute inset-0 opacity-[0.035] mix-blend-overlay" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background/50 to-transparent" />
      </div>

      <div className={cn("relative mx-auto max-w-6xl px-6 sm:px-10", isStage ? "pb-10 pt-24 sm:pt-28" : "py-14")}>
        {/* ===== Stage: editorial statement + value pillars ===== */}
        {isStage && (
          <div className="text-center">
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: EASE }}
              className={`text-xs text-primary ${track}`}
            >
              {t("land.cta.sub")}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
              className="mx-auto mt-5 max-w-2xl font-bold leading-[1.14]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--fs-h2)",
              }}
            >
              {t("land.cta.title")}
            </motion.h2>

            {showCta && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                className="mx-auto mt-11 grid max-w-2xl gap-4 sm:grid-cols-2"
              >
                {DOORS.map((d) => (
                  <motion.div key={d.key} variants={staggerItem} className="plate">
                    <Link
                      href={d.href}
                      data-cursor="hover"
                      className="plate-face group/door flex h-full flex-col items-start gap-2 p-6 text-start transition-colors duration-500"
                      style={{
                        background:
                          "color-mix(in srgb, var(--primary) 7%, var(--background))",
                      }}
                    >
                      <span className="flex w-full items-center justify-between gap-3">
                        <span
                          className="text-lg font-bold"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {t(d.key)}
                        </span>
                        <ArrowUpRight className="size-4 shrink-0 text-primary transition-transform duration-500 group-hover/door:-translate-y-0.5 group-hover/door:translate-x-0.5 rtl:group-hover/door:-translate-x-0.5" />
                      </span>
                      <span
                        aria-hidden
                        className="block h-px w-10 bg-gradient-to-r from-primary/60 to-transparent transition-[width] duration-700 group-hover/door:w-20 rtl:bg-gradient-to-l"
                      />
                      <span className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {t(d.desc)}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ===== The record =====
                Two statements at display size, staggered against each other. The second
                is inset and offset so the pair reads as a composition rather than a
                list — the footer's own rule is "asymmetric, never equal columns", and
                that applies here as much as to the link row below. Each sits on its own
                Z plane and lifts toward the reader on hover. */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className={cn("mx-auto max-w-4xl text-start", showCta ? "mt-20" : "mt-24")}
              style={{ perspective: reduce ? undefined : "1100px" }}
            >
              <div style={{ transformStyle: reduce ? undefined : "preserve-3d" }}>
                {PILLARS.map((p, i) => (
                  <motion.div
                    key={p.key}
                    variants={staggerItem}
                    className={cn(
                      "group/p relative",
                      // The stagger: the second statement steps in and sits lower.
                      i === 1 && "mt-12 sm:mt-16 lg:ms-[28%] lg:w-[72%]",
                      i === 0 && "lg:w-[76%]"
                    )}
                    style={
                      reduce ? undefined : { transform: `translateZ(${i === 0 ? 0 : -26}px)` }
                    }
                  >
                    <motion.div
                      whileHover={reduce ? undefined : { z: 34 }}
                      transition={{ duration: 0.55, ease: EASE }}
                    >
                      {/* Engraved numeral above the line, not beside it — at this size
                          it becomes a mark on the page rather than a bullet. */}
                      <span
                        aria-hidden
                        className="font-numeric block text-[11px] text-primary/70 transition-colors duration-500 group-hover/p:text-primary"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <span
                        aria-hidden
                        className="mt-3 block h-px w-16 origin-[left_center] bg-gradient-to-r from-primary/60 to-transparent transition-[width] duration-700 group-hover/p:w-28 rtl:origin-[right_center] rtl:bg-gradient-to-l"
                      />

                      <p
                        className={cn(
                          "mt-5 max-w-2xl text-2xl font-bold text-foreground/85 transition-colors duration-500 group-hover/p:text-foreground sm:text-3xl lg:text-[2.35rem]",
                          rtl ? "leading-[1.42]" : "leading-[1.18] tracking-[-0.018em]"
                        )}
                        style={{ fontFamily: "var(--font-heading)" }}
                      >
                        {t(p.key)}
                      </p>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* ===== Identity + navigation (asymmetric, never equal columns) ===== */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className={cn(
            "grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.75fr_0.75fr_0.75fr]",
            isStage && "mt-20 border-t border-border/50 pt-14"
          )}
        >
          <motion.div variants={staggerItem} className="sm:col-span-2 lg:col-span-1">
            <Link href="/" data-cursor="hover" className="inline-block">
              <Logo />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("foot.desc")}
            </p>
          </motion.div>

          <motion.div variants={staggerItem}>
            <GroupHeading index={1}>{t("foot.group.explore")}</GroupHeading>
            <ul className="mt-5 space-y-3.5">
              {exploreLinks.map((l) => (
                <li key={l.label}>
                  <FootLink href={l.href}>{l.label}</FootLink>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={staggerItem}>
            <GroupHeading index={2}>{t("foot.group.company")}</GroupHeading>
            <ul className="mt-5 space-y-3.5">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <FootLink href={l.href}>{l.label}</FootLink>
                </li>
              ))}
              <li>
                <FootLink href={accountHref}>{accountLabel}</FootLink>
              </li>
            </ul>
          </motion.div>

          <motion.div variants={staggerItem}>
            <GroupHeading index={3}>{t("foot.group.legal")}</GroupHeading>
            <ul className="mt-5 space-y-3.5">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <FootLink href={l.href}>{l.label}</FootLink>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        <div className="mt-14 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <p className="order-2 text-xs text-muted-foreground sm:order-1">
            © {new Date().getFullYear()} Vestora. {t("land.foot.rights")}
          </p>

          <div className="order-1 flex items-center gap-4 sm:order-2">
            <div className="flex items-center gap-1">
              {SOCIAL_LINKS.map((s) => (
                <SocialIcon key={s.name} name={s.name} href={s.href} icon={s.icon} />
              ))}
            </div>
            {isStage && (
              <>
                <span className="h-5 w-px bg-border" />
                <BackToTop label={t("foot.backToTop")} reduce={reduce} />
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
