"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { Guilloche } from "@/components/auth/guilloche";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The auth stage.
 *
 * What this replaces was a centred card on a gradient — the exact shape of every SaaS
 * sign-in ever shipped, and the one composition that tells a member nothing about the
 * product they are entering. It also left `auth.panel.title` and `auth.panel.subtitle`
 * stranded in the dictionary: someone had intended a two-part composition and it was
 * never built.
 *
 * So the page is a stage with two unequal halves. The wide side is the engraving — a
 * guilloché rosette set back in real Z, a statement in the display face, and a gold rule
 * running the full height. The narrow side carries the form on a plate that sits
 * *forward* of everything else. Nothing is centred, because a certificate is not
 * centred: it has a field and it has a signature block.
 *
 * Depth is genuine — `perspective` on the container, layers on their own Z planes, and
 * pointer parallax that moves them at different rates so they separate as the cursor
 * travels. It is CSS, so it costs nothing, and it is bounded: this is a page people pass
 * through in seconds, not a demo they should stop and admire.
 *
 * On a phone the two halves collapse rather than shrink. The statement becomes a short
 * masthead, the engraving grows and dims behind it, and the form takes the full column.
 * A squeezed desktop composition would have put a 40-character line next to a form.
 */
export function AuthStage({
  children,
  /** Overrides the stage statement — used by the narrower recovery pages. */
  eyebrow,
  title,
  /** Renders the form column wider, for the two-column registration form. */
  wide,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  wide?: boolean;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Back = rtl ? ArrowRight : ArrowLeft;
  const reduce = useReducedMotion() ?? false;

  const stage = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 20, mass: 0.6 });

  // Each plane gets its own travel, which is what makes the separation readable.
  const engraveX = useTransform(sx, [-1, 1], [26, -26]);
  const engraveY = useTransform(sy, [-1, 1], [18, -18]);
  const statementX = useTransform(sx, [-1, 1], [10, -10]);
  const plateX = useTransform(sx, [-1, 1], [-7, 7]);
  // A sheen that crosses the plate as the pointer does, rather than a static gloss.
  const sheenX = useTransform(sx, [-1, 1], ["-30%", "130%"]);

  function onPointerMove(e: React.PointerEvent) {
    // Mouse only. On touch this fires once per tap and would jolt the whole stage.
    if (reduce || e.pointerType !== "mouse" || !stage.current) return;
    const r = stage.current.getBoundingClientRect();
    px.set(((e.clientX - r.left) / r.width) * 2 - 1);
    py.set(((e.clientY - r.top) / r.height) * 2 - 1);
  }

  return (
    <div
      ref={stage}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      className="relative min-h-svh w-full bg-[radial-gradient(125%_125%_at_18%_0%,#fdfbf5_0%,#f4ecda_52%,#e8dabd_100%)] dark:bg-[radial-gradient(125%_125%_at_18%_0%,#1d1712_0%,#110e0a_55%,#070605_100%)]"
    >
      {/* ============ ENGRAVING PLANES ============
          `fixed`, not `absolute`. On sign-in the page is one screen tall so the two
          behave identically, but registration is far taller than the viewport — and an
          absolutely-positioned rosette anchored to `top-1/2` of *that* container sits at
          the midpoint of the whole scrollable page, drifting away as you fill the form
          and leaving the lower half on a bare gradient. Fixed keeps the engraving behind
          the reader the whole way down.

          Note the perspective is deliberately NOT on this wrapper: `perspective` on an
          ancestor makes it the containing block for fixed descendants, which would
          silently turn these back into `absolute`. It lives on the content grid below,
          where the layers that actually need it are. */}
      {/* The clip stays still; the parallax happens on an oversized child inside it.
          Translating the clip itself is what dragged its own edge into view — that bare
          strip of page background along the top. The inner plane overhangs by 8rem on
          every side, so its edges can never travel far enough to be seen. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <motion.div
          style={reduce ? undefined : { x: engraveX, y: engraveY }}
          className="absolute -inset-32"
        >
          {/* Off-centre so the rosette anchors the wide half rather than sitting behind
              the form — and mirrored in Arabic, where the form is on the other side.
              This was `lg:left-[26%]`, a physical property, so the engraving stayed put
              while the whole composition flipped around it. */}
          <Guilloche
            className={cn(
              "absolute text-[#b08a3f]/[0.22] dark:text-[#c7a968]/[0.13]",
              "left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2",
              "lg:h-[1020px] lg:w-[1020px]",
              rtl ? "lg:left-auto lg:right-[28%] lg:translate-x-1/2" : "lg:left-[28%]"
            )}
          />
          <span className="film-grain absolute inset-0 opacity-[0.05] mix-blend-overlay" />
        </motion.div>
      </div>

      {/* A second, nearer ring at a different depth — one rosette alone reads flat. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden lg:block"
      >
        <motion.div
          style={reduce ? undefined : { x: engraveY, y: engraveX }}
          className="absolute -inset-32"
        >
          {[420, 620].map((size) => (
            <span
              key={size}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full border",
                size === 420 ? "border-primary/[0.13]" : "border-primary/[0.08]",
                rtl ? "right-[28%] translate-x-1/2" : "left-[28%] -translate-x-1/2"
              )}
              style={{ width: size, height: size }}
            />
          ))}
        </motion.div>
      </div>

      {/* ============ TOP BAR ============ */}
      <div className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link
          href="/"
          data-cursor="hover"
          className="group/back inline-flex items-center gap-1.5 rounded-full text-[13px] text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <Back
            className={cn(
              "size-3.5 transition-transform duration-300",
              rtl ? "group-hover/back:translate-x-0.5" : "group-hover/back:-translate-x-0.5"
            )}
          />
          <span className="hidden sm:inline">{t("auth.backHome")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* ============ STAGE ============
          The perspective lives here rather than on the page wrapper, so the fixed
          engraving above keeps its viewport containing block. */}
      <div
        className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-y-10 px-5 pb-16 pt-2 sm:px-8 lg:grid-cols-12 lg:gap-x-10 lg:pb-24 lg:pt-8"
        style={{ perspective: reduce ? undefined : "1400px" }}
      >
        {/* ---- Statement. Full editorial on desktop, compact masthead on a phone. ---- */}
        {/* On registration the form runs well past one screen, so the statement is
            pinned rather than scrolled away — the page keeps its two halves the whole
            way down instead of degrading into a lone form on a gradient. Only when
            `wide`: sign-in is a single screen, where sticky would do nothing and
            `self-start` would break the centred composition. */}
        <motion.div
          style={reduce ? undefined : { x: statementX }}
          className={cn(
            "lg:col-span-6 lg:pe-6",
            wide ? "xl:col-span-5 lg:sticky lg:top-24 lg:self-start" : ""
          )}
        >
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className={cn(
              "text-[11px] text-primary",
              rtl ? "" : "uppercase tracking-[0.34em]"
            )}
          >
            {eyebrow ?? t("auth.stage.eyebrow")}
          </motion.p>

          {/* Masked reveal, one line at a time — the house entrance. */}
          <span className="mt-4 block overflow-hidden pb-1 lg:mt-6">
            <motion.h1
              initial={reduce ? { opacity: 0 } : { y: "112%" }}
              animate={reduce ? { opacity: 1 } : { y: 0 }}
              transition={{ duration: 1.05, delay: 0.08, ease: EASE }}
              className={cn(
                "max-w-xl text-[1.9rem] font-bold sm:text-4xl lg:text-[3.4rem]",
                rtl ? "leading-[1.3]" : "leading-[1.04] tracking-[-0.02em]"
              )}
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title ?? t("auth.panel.title")}
            </motion.h1>
          </span>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            style={{ transformOrigin: rtl ? "right" : "left" }}
            className="mt-6 h-px w-28 bg-gradient-to-r from-primary to-transparent lg:mt-8"
          />

          {/* Desktop only: the supporting line and the seal. On a phone this is the
              space the on-screen keyboard is about to take. */}
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.34, ease: EASE }}
            className="mt-6 hidden max-w-md text-[15px] leading-relaxed text-muted-foreground lg:block"
          >
            {t("auth.panel.subtitle")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-12 hidden text-[11px] text-muted-foreground/70 lg:block"
          >
            {t("auth.panel.footer")}
          </motion.p>
        </motion.div>

        {/* ---- The plate. Sits forward of every other plane. ---- */}
        {/* No 3D rotation on this plate, deliberately.
            It used to carry a continuous `rotateY`/`rotateX` from the pointer, and a
            browser rasterises a rotated layer once and then transforms the bitmap — which
            softens every glyph inside it. On a card whose entire job is legible form
            labels that is the wrong trade, and it is what made the sign-up card look
            faintly out of focus. Depth now comes from the parallax behind it, where there
            is no text to blur, plus a lateral drift here that stays crisp. */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.16, ease: EASE }}
          style={reduce ? undefined : { x: plateX }}
          className={cn(
            "relative lg:col-span-6",
            wide ? "xl:col-span-7" : "xl:col-start-8 xl:col-span-5"
          )}
        >
          {/* `bg-card/94` + a lighter backdrop blur: at 85% the engraving showed through
              behind the labels, which read as the card itself being blurry. */}
          <div className="relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/94 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.55)] backdrop-blur-md sm:rounded-[1.75rem]">
            {/* Engraved top edge — the plate's tell. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />
            {/* Pointer-tracked sheen. Purely light; it never occludes the form. */}
            {!reduce && (
              <motion.span
                aria-hidden
                style={{ x: sheenX }}
                className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/[0.05] to-transparent"
              />
            )}

            {/* Generous by design. Sign-in carries only two fields, which left the
                plate looking stunted beside the full-height statement column — the form
                read as an afterthought rather than the point of the page. The extra room
                is padding and rhythm, not filler content. */}
            <div className="relative px-6 py-9 sm:px-10 sm:py-12">
              {/* The mark. The translateZ it used to carry is inert now that the plate is
                  no longer a 3D context, so it is gone rather than left as a no-op. */}
              <div className="mb-9 flex items-center gap-3 sm:mb-11">
                <Logo />
                <span aria-hidden className="h-px flex-1 bg-border" />
              </div>

              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
