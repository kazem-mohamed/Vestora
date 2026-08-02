"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  FileText,
  HandCoins,
  Info,
  Map,
  Megaphone,
  ScrollText,
  Stamp,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { TrustSignal } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const ICONS: Record<string, LucideIcon> = {
  email_confirmed: BadgeCheck,
  member_since: CalendarClock,
  admin_reviewed: Stamp,
  documents_published: FileText,
  roadmap_maintained: Map,
  posts_updates: Megaphone,
  team_listed: Users,
  backed_rounds: HandCoins,
  endorsed_by_backers: ScrollText,
  mandate_stated: Target,
  rounds_completed: Target,
};

/**
 * Levels, ordered strongest first. The ordering is the whole editorial argument: a
 * fact the platform checked outranks a track record, which outranks something the
 * member typed about themselves — and the reader can see which is which.
 */
const LEVEL_ORDER: TrustSignal["level"][] = ["Verified", "History", "SelfReported"];

const LEVEL_STYLE: Record<TrustSignal["level"], string> = {
  Verified: "border-primary/30 text-primary",
  History: "border-bronze/30 text-bronze",
  SelfReported: "border-border text-muted-foreground",
};

/**
 * Formats a signal's value. Most are plain counts; `member_since` is an ISO date and
 * `roadmap_maintained` is a "done/total" pair, so neither can go through a number
 * formatter.
 */
function useValueText() {
  const { locale } = useLocale();
  return (s: TrustSignal): string | null => {
    if (!s.value) return null;
    if (s.key === "member_since") {
      const d = new Date(s.value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        month: "short",
        year: "numeric",
      });
    }
    return s.value;
  };
}

/**
 * What Vestora can actually prove — and, said plainly, what it cannot.
 *
 * The signals themselves come from the server, which only ever states which facts are
 * true; all wording lives here, in both languages. That split is deliberate: the
 * moment a badge's phrasing lives in the database, someone eventually softens
 * "an admin looked at this listing" into "verified", and the product starts lying.
 *
 * There is no aggregate score and no tick-in-a-circle. A single number invites the
 * comparison the underlying facts cannot support, and would be read as a rating of a
 * business nobody here has audited. Instead each fact is named for exactly what it is
 * and tagged with how much it is worth, and the disclosure that closes the block says
 * out loud that none of this is diligence.
 */
export function TrustSignals({
  signals,
  subject,
  className,
}: {
  signals: TrustSignal[];
  /** Changes only the closing disclosure — a listing and a person warrant different wording. */
  subject: "venture" | "person";
  className?: string;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const valueText = useValueText();
  const [openNote, setOpenNote] = useState(false);

  if (signals.length === 0) return null;

  // Strongest first, so the reader meets the checked facts before the self-reported ones.
  const ordered = [...signals].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
  );

  return (
    <section className={cn("relative", className)} aria-labelledby="trust-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="trust-heading"
          className={cn(
            "text-[11px] text-muted-foreground",
            rtl ? "" : "uppercase tracking-[0.22em]"
          )}
        >
          {t("trust.heading")}
        </h2>
        <button
          type="button"
          data-cursor="hover"
          aria-expanded={openNote}
          aria-controls="trust-note"
          onClick={() => setOpenNote((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full text-[11px] text-muted-foreground outline-none transition-colors duration-300 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <Info className="size-3" strokeWidth={1.9} />
          {t("trust.whatThisMeans")}
        </button>
      </div>

      <ul className="mt-3.5 flex flex-wrap gap-2">
        {ordered.map((s, i) => {
          const Icon = ICONS[s.key] ?? BadgeCheck;
          const value = valueText(s);
          return (
            <motion.li
              key={s.key}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.05, ease: EASE }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 py-1.5 backdrop-blur-sm",
                LEVEL_STYLE[s.level]
              )}
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={1.9} />
              <span className="text-xs text-foreground/90">{t(`trust.${s.key}`)}</span>
              {value && (
                <span className="font-numeric text-[11px] text-muted-foreground">{value}</span>
              )}
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence initial={false}>
        {openNote && (
          <motion.div
            id="trust-note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-s-2 border-primary/30 ps-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t(subject === "venture" ? "trust.note.venture" : "trust.note.person")}
              </p>
              {/* The three levels, explained once, where someone asking "what does that
                  tag mean" is already looking. */}
              <dl className="mt-3 space-y-1.5">
                {LEVEL_ORDER.map((lvl) => (
                  <div key={lvl} className="flex gap-2 text-[11px] leading-relaxed">
                    <dt
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-px",
                        LEVEL_STYLE[lvl]
                      )}
                    >
                      {t(`trust.level.${lvl.toLowerCase()}`)}
                    </dt>
                    <dd className="min-w-0 text-muted-foreground">
                      {t(`trust.level.${lvl.toLowerCase()}.body`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
