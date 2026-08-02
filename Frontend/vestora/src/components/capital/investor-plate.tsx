"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, Check, Layers } from "lucide-react";
import { avatarUrl } from "@/lib/api/users";
import { compactUsd } from "@/lib/format/money";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { InvestorCard } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * One entry in the capital register.
 *
 * Reads mandate-first: what this investor is looking for, in their own words, at
 * editorial scale — because that sentence is what a founder is actually deciding
 * on. The evidence sits beneath as engraved facts, deliberately quieter than the
 * thesis and never arranged as a row of metric tiles. A directory of people is
 * not a dashboard, and the moment it looks like one a founder starts comparing
 * numbers instead of reading intent.
 *
 * Depth is real: the plate sits in a perspective scene and its layers separate in
 * Z, so the tilt is computed by the compositor rather than faked with offsets.
 */
export function InvestorPlate({
  investor,
  index,
  onApproach,
}: {
  investor: InvestorCard;
  index: number;
  onApproach: (investor: InvestorCard) => void;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Pointer position drives both the tilt and the specular sweep, so the light
  // and the geometry agree with each other.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 80, damping: 24, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 80, damping: 24, mass: 0.6 });

  const rotateY = useTransform(sx, [-0.5, 0.5], [-5, 5]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [3.5, -3.5]);
  const glareX = useTransform(sx, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(sy, [-0.5, 0.5], ["0%", "100%"]);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, color-mix(in oklab, var(--primary) 10%, transparent), transparent 60%)`;

  function onPointerMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  const thesis = investor.investmentThesis?.trim();
  const stated = (investor.preferredIndustries ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // What they say they back vs what they have actually backed. Showing the second
  // set separately is the whole point — a stated preference is a claim, a funded
  // sector is a fact.
  const proven = investor.activeSectors;

  const ticket =
    investor.ticketMin != null && investor.ticketMax != null
      ? `${compactUsd(investor.ticketMin)} – ${compactUsd(investor.ticketMax)}`
      : investor.ticketMin != null
        ? t("cap.ticket.from").replace("{v}", compactUsd(investor.ticketMin))
        : investor.ticketMax != null
          ? t("cap.ticket.upTo").replace("{v}", compactUsd(investor.ticketMax))
          : null;

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, delay: (index % 3) * 0.07, ease: EASE }}
      style={{ perspective: 1300 }}
      className="group/plate relative"
    >
      <motion.div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={() => {
          px.set(0);
          py.set(0);
        }}
        style={reduce ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={cn(
          "relative overflow-hidden rounded-[1.4rem] border bg-card/50 backdrop-blur-sm",
          "transition-colors duration-500",
          investor.alreadyConnected
            ? "border-primary/30"
            : "border-border/70 hover:border-primary/30"
        )}
      >
        {/* Engraved hairline at the head of the plate, as on a certificate. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />

        {/* The light lives behind the surface. */}
        {!reduce && (
          <motion.span
            aria-hidden
            style={{ background: glare, transform: "translateZ(-30px)" }}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/plate:opacity-100"
          />
        )}

        <div className="relative p-6 sm:p-7" style={{ transform: "translateZ(20px)" }}>
          {/* ---- Identity ---- */}
          <div className="flex items-start gap-4">
            <Link
              href={`/u/${investor.id}`}
              data-cursor="hover"
              aria-label={investor.userName}
              className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border transition-transform duration-500 group-hover/plate:scale-[1.06]"
            >
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(120% 120% at 25% 15%, color-mix(in oklab, var(--primary) 28%, transparent), transparent 60%)",
                }}
              />
              {investor.hasAvatar && !failed ? (
                <img
                  src={avatarUrl(investor.id)}
                  alt=""
                  loading="lazy"
                  onError={() => setFailed(true)}
                  className="relative h-full w-full object-cover"
                />
              ) : (
                <span
                  className="relative text-xs text-primary"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {initials(investor.userName)}
                </span>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/u/${investor.id}`}
                data-cursor="hover"
                className="group/name inline-flex items-baseline gap-1.5"
              >
                <h3
                  className="truncate text-lg font-bold text-foreground transition-colors duration-300 group-hover/name:text-primary"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {investor.userName}
                </h3>
                <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity duration-300 group-hover/name:opacity-100" />
              </Link>

              {investor.alreadyConnected && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-primary">
                  <Check className="size-3" strokeWidth={2.4} />
                  {t("cap.connected")}
                </p>
              )}
            </div>
          </div>

          {/* ---- The mandate: the reason this plate exists ---- */}
          {thesis ? (
            <blockquote
              className={cn(
                "mt-5 border-s-2 border-primary/30 ps-4 text-[15px] leading-relaxed text-foreground/85",
                rtl ? "" : "tracking-[-0.005em]"
              )}
            >
              {thesis}
            </blockquote>
          ) : investor.briefBio ? (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {investor.briefBio}
            </p>
          ) : (
            // Said plainly rather than dressed up. An investor who has not written a
            // thesis is not a worse investor, and pretending otherwise would be a lie
            // told by layout.
            <p className="mt-5 text-sm italic leading-relaxed text-muted-foreground/70">
              {t("cap.noThesis")}
            </p>
          )}

          {/* ---- Evidence, engraved ---- */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border/60 pt-5">
            <Fact
              label={t("cap.fact.backed")}
              value={String(investor.backedCount)}
              emphasis={investor.backedCount > 0}
            />
            {ticket && <Fact label={t("cap.fact.ticket")} value={ticket} />}
            {investor.activeRelationships > 0 && (
              <Fact
                label={t("cap.fact.active")}
                value={String(investor.activeRelationships)}
              />
            )}
          </div>

          {/* Proven sectors read louder than stated ones, because they are facts. */}
          {(proven.length > 0 || stated.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {proven.map((s) => (
                <span
                  key={`p-${s}`}
                  title={t("cap.sector.backed")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-2.5 py-1 text-[11px] text-primary/90"
                >
                  <Layers className="size-2.5" strokeWidth={2.2} />
                  {s}
                </span>
              ))}
              {stated
                .filter((s) => !proven.some((p) => p.toLowerCase() === s.toLowerCase()))
                .slice(0, 4)
                .map((s) => (
                  <span
                    key={`s-${s}`}
                    title={t("cap.sector.stated")}
                    className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
            </div>
          )}

          {/* ---- The one action ---- */}
          <button
            type="button"
            data-cursor="hover"
            onClick={() => onApproach(investor)}
            className={cn(
              "mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-5 text-sm outline-none",
              "transition-all duration-300 focus-visible:ring-3 focus-visible:ring-ring/25",
              "border-border text-foreground hover:border-primary/50 hover:bg-primary/[0.05] hover:text-primary"
            )}
          >
            {investor.alreadyConnected ? t("cap.approach.again") : t("cap.approach")}
          </button>
        </div>
      </motion.div>
    </motion.article>
  );
}

/** A single engraved fact: small caps label over a numeric value. */
function Fact({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  const { locale } = useLocale();
  const rtl = locale === "ar";
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "text-[10px] text-muted-foreground",
          rtl ? "" : "uppercase tracking-[0.18em]"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-numeric mt-1 truncate text-sm",
          emphasis ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
