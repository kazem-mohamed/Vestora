"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileQuestion,
  FileText,
  Flag,
  HelpCircle,
  Hourglass,
  MessageSquareQuote,
  Undo2,
  XCircle,
} from "lucide-react";
import { money } from "@/components/funding/funding-primitives";
import { stageLabelKey } from "@/lib/deals/stages";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealEvent, DealEventType } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * How each kind of event reads. Weight matters: a stage change is a decision and
 * should feel like one, while a document appearing is a fact and should not shout.
 */
const KIND: Record<
  DealEventType,
  {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    tone: "decision" | "exchange" | "quiet" | "end" | "money";
  }
> = {
  opened: { icon: Flag, tone: "decision" },
  stage: { icon: ArrowRight, tone: "decision" },
  question: { icon: HelpCircle, tone: "exchange" },
  answer: { icon: MessageSquareQuote, tone: "exchange" },
  doc_request: { icon: FileQuestion, tone: "exchange" },
  doc_fulfilled: { icon: CheckCircle2, tone: "exchange" },
  doc_declined: { icon: XCircle, tone: "quiet" },
  document: { icon: FileText, tone: "quiet" },
  declined: { icon: XCircle, tone: "end" },
  round_closed: { icon: Flag, tone: "end" },

  // Money gets its own tone rather than borrowing "decision". A payment settling is
  // the single most consequential thing that can happen in a relationship, and the
  // chronology should not make it look like a stage change.
  funds_requested: { icon: Hourglass, tone: "money" },
  payment_succeeded: { icon: Banknote, tone: "money" },
  payment_failed: { icon: AlertTriangle, tone: "quiet" },
  payment_refunded: { icon: Undo2, tone: "end" },
  funding_cancelled: { icon: XCircle, tone: "quiet" },
  funding_expired: { icon: Hourglass, tone: "quiet" },
};

/** Events whose `detail` is an amount rather than prose. */
const MONEY_DETAIL = new Set<DealEventType>([
  "opened",
  "funds_requested",
  "payment_succeeded",
  "payment_refunded",
]);

/**
 * One chronology for the whole relationship.
 *
 * The facts were always there — spread across the investment, the messages, the data
 * room and the notifications — and reading them meant assembling the story in your
 * head from four different screens. A single spine, newest first, is what turns a pile
 * of records into something either side can actually recall.
 *
 * The rail is a real vertical line with events hung off it, not a list of cards: a
 * relationship is a sequence, and the layout should say so.
 */
export function DealTimeline({ events }: { events: DealEvent[] }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;

  if (events.length === 0) return null;

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative">
      {/* The spine. Drawn as a gradient so it fades rather than stopping dead. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-2 bottom-2 w-px bg-gradient-to-b from-border via-border to-transparent",
          rtl ? "right-[15px]" : "left-[15px]"
        )}
      />

      <ol className="space-y-5">
        {events.map((e, i) => {
          const kind = KIND[e.type] ?? KIND.document;
          const Icon = kind.icon;

          return (
            <motion.li
              key={`${e.type}-${e.refId ?? i}-${e.atUtc}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: rtl ? 14 : -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: Math.min(i, 6) * 0.05, ease: EASE }}
              className="relative flex gap-4"
            >
              {/* Node. Decisions get a filled mark, everything else a hairline. */}
              <span
                className={cn(
                  "relative z-10 mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border",
                  kind.tone === "decision" && "border-primary/50 bg-primary/[0.10] text-primary",
                  kind.tone === "exchange" && "border-border bg-card text-foreground/70",
                  kind.tone === "quiet" && "border-border/60 bg-card text-muted-foreground",
                  kind.tone === "end" && "border-bronze/50 bg-bronze/[0.08] text-bronze",
                  kind.tone === "money" && "border-primary/60 bg-primary/[0.14] text-primary"
                )}
                style={
                  kind.tone === "money" && !reduce
                    ? {
                        boxShadow:
                          "0 0 0 4px color-mix(in oklab, var(--primary) 8%, transparent)",
                      }
                    : undefined
                }
              >
                <Icon className="size-3.5" strokeWidth={1.9} />
              </span>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <p
                    className={cn(
                      "text-sm",
                      kind.tone === "decision" || kind.tone === "money"
                        ? "font-medium text-foreground"
                        : "text-foreground/85"
                    )}
                  >
                    {/* Stage names come from the pipeline and are translated through
                        the same map the pills use — `pipe.stage.*` was never a real key
                        namespace, so every stage event rendered its own lookup string. */}
                    {e.type === "stage" || e.type === "declined"
                      ? t("deal.event.stage").replace("{stage}", t(stageLabelKey(e.detail)))
                      : e.type === "round_closed"
                        ? t("deal.event.roundClosed")
                        : t(`deal.event.${e.type}`)}
                  </p>
                  <time
                    dateTime={e.atUtc}
                    className="font-numeric text-[11px] text-muted-foreground"
                  >
                    {fmt.format(new Date(e.atUtc))}
                  </time>
                </div>

                {e.actorName && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{e.actorName}</p>
                )}

                {/* Amounts read as amounts, not as quoted prose in a blockquote. */}
                {e.detail && MONEY_DETAIL.has(e.type) && (
                  <p
                    className={cn(
                      "font-numeric mt-1.5 text-sm",
                      kind.tone === "money" ? "text-bronze" : "text-muted-foreground"
                    )}
                  >
                    {money(Number(e.detail))}
                  </p>
                )}

                {/* The payload, quoted rather than paraphrased — a question should read
                    as the question that was asked. */}
                {e.detail &&
                  !MONEY_DETAIL.has(e.type) &&
                  e.type !== "stage" &&
                  e.type !== "declined" && (
                    <p
                      className={cn(
                        "mt-2 border-s-2 border-border/60 ps-3 text-xs leading-relaxed text-muted-foreground",
                        e.type === "answer" && "border-primary/30 text-foreground/80",
                        e.type === "payment_failed" && "border-destructive/40 text-destructive/85"
                      )}
                    >
                      {e.detail}
                    </p>
                  )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
