import type { PipelineStage } from "@/lib/types/api";

/**
 * The relationship pipeline's vocabulary, in one place.
 *
 * This lived inside `components/invest/invest-primitives.tsx`, which meant any
 * component that needed only the label map had to import a module full of
 * charts, images and motion to get it — and the deal timeline importing it that
 * way left the binding unresolved at runtime. A lookup table is data, not a
 * component, so it belongs here where anything can read it without dragging a
 * render tree along behind it.
 */
export const STAGE_ORDER: PipelineStage[] = [
  "New",
  "Reviewing",
  "Approved",
  "Contacted",
  "InDiscussion",
  "Committed",
  "Closed",
];

export const STAGE_LABEL_KEY: Record<PipelineStage, string> = {
  New: "stage.new",
  Reviewing: "stage.reviewing",
  Approved: "stage.approved",
  Contacted: "stage.contacted",
  InDiscussion: "stage.inDiscussion",
  Committed: "stage.committed",
  Closed: "stage.closed",
  Declined: "stage.declined",
};

/** Translation key for a stage that may have arrived as an unknown string. */
export function stageLabelKey(stage: string | null | undefined): string {
  return STAGE_LABEL_KEY[stage as PipelineStage] ?? "stage.new";
}

/**
 * Tone per stage: bronze = waiting on someone, primary = progressing,
 * muted = ended. Kept beside the labels so a new stage cannot gain a name
 * without also gaining a colour.
 */
export function stageTone(stage: PipelineStage): string {
  if (stage === "Declined") return "border-destructive/40 bg-destructive/[0.06] text-destructive";
  if (stage === "Closed") return "border-border text-muted-foreground";
  if (stage === "New" || stage === "Reviewing") return "border-bronze/40 bg-bronze/[0.07] text-bronze";
  return "border-primary/40 bg-primary/[0.07] text-primary";
}
