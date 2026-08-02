"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, Flag, PauseCircle, Pencil, ShieldAlert, Clock } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

type Tone = "neutral" | "warn" | "danger";

/**
 * The founder standing on their own public listing.
 *
 * Until now the owner saw precisely what a stranger saw, with no way to tell
 * whether the page was actually reachable. That matters most in the states where
 * it is NOT: a paused round and a rejected listing both render a complete,
 * confident page that nobody else can open. This says which state the listing is
 * in, what that means for visitors, and where to act on it.
 */
export function OwnerPreviewBanner({ project }: { project: Project }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;

  const moderation = project.moderationStatus;
  const paused = project.lifecycleStatus === "Paused";
  const closed = project.lifecycleStatus === "Closed";

  let tone: Tone = "neutral";
  let Icon = Eye;
  let title = t("proj.owner.live.title");
  let body = t("proj.owner.live.body");

  if (moderation === "Rejected") {
    tone = "danger";
    Icon = ShieldAlert;
    title = t("proj.owner.rejected.title");
    body = t("proj.owner.rejected.body");
  } else if (moderation && moderation !== "Approved") {
    tone = "warn";
    Icon = Clock;
    title = t("proj.owner.pending.title");
    body = t("proj.owner.pending.body");
  } else if (paused) {
    tone = "warn";
    Icon = PauseCircle;
    title = t("proj.owner.paused.title");
    body = t("proj.owner.paused.body");
  } else if (project.roundClosedAtUtc) {
    // A closed round is a different thing from a paused one, and the founder should
    // see the outcome they stated rather than a generic "closed".
    tone = "neutral";
    Icon = Flag;
    title = t("proj.owner.roundClosed.title").replace(
      "{outcome}",
      t(`round.outcome.${project.roundOutcome ?? "Completed"}`)
    );
    body = project.roundClosingNote?.trim() || t("proj.owner.roundClosed.body");
  } else if (closed) {
    tone = "neutral";
    Icon = PauseCircle;
    title = t("proj.owner.closed.title");
    body = t("proj.owner.closed.body");
  }

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn(
        "relative mx-auto mt-6 flex max-w-6xl flex-col gap-4 rounded-2xl border px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6",
        tone === "danger" && "border-destructive/35 bg-destructive/[0.05]",
        tone === "warn" && "border-bronze/40 bg-bronze/[0.05]",
        tone === "neutral" && "border-border/70 bg-card/50"
      )}
    >
      <div className="flex min-w-0 gap-3.5">
        <Icon
          className={cn(
            "mt-0.5 size-[18px] shrink-0",
            tone === "danger" && "text-destructive",
            tone === "warn" && "text-bronze",
            tone === "neutral" && "text-muted-foreground"
          )}
          strokeWidth={1.8}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>

          {/* The admin's reason, when there is one — the founder is the audience
              for it, and the API only sends it to them. */}
          {moderation === "Rejected" && project.moderationNote && (
            <p className="mt-2.5 rounded-lg border border-destructive/25 bg-background/50 px-3 py-2 text-xs leading-relaxed text-foreground/85">
              {project.moderationNote}
            </p>
          )}
        </div>
      </div>

      <Link
        href={`/my-projects/${project.id}/edit`}
        data-cursor="hover"
        className={cn(
          "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm text-foreground outline-none",
          "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
          "focus-visible:ring-3 focus-visible:ring-ring/25"
        )}
      >
        <Pencil className="size-3.5" strokeWidth={1.8} />
        {t("proj.owner.edit")}
      </Link>
    </motion.div>
  );
}
