import type { Transition, Variants } from "framer-motion";

/**
 * Browse motion language.
 *
 * One idea runs through the page: a venture ARRIVES by being uncovered, not by
 * fading in. Imagery is unmasked with a clip-path wipe, type rises out from
 * behind its own edge, and anything that moves does so on the compositor
 * (transform / opacity / clip-path only — never width, top or filter).
 *
 * Three speeds, used consistently so the page reads as one system:
 *   REVEAL   — content arriving (slow, cinematic)
 *   RESPOND  — reacting to the pointer (quick, physical)
 *   SETTLE   — layout reordering after a filter or sort (springy, traceable)
 */

/** The house curve — a long, decelerating ease used for every reveal. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Slightly sharper, for elements responding to direct input. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const REVEAL: Transition = { duration: 0.9, ease: EASE };
export const RESPOND: Transition = { duration: 0.45, ease: EASE_OUT };
export const SETTLE: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };

/** Stagger caps: a long list must not turn the last row into a wait. */
export const STAGGER = 0.055;
export const MAX_STAGGER_STEPS = 7;

export function stepDelay(index: number, step = STAGGER): number {
  return Math.min(index, MAX_STAGGER_STEPS) * step;
}

/**
 * Cinematic image reveal: the plate is uncovered from the bottom edge while the
 * picture inside settles back from a slight over-scale. Two layers moving at
 * different rates reads as depth without any 3D transform.
 */
export const plateVariants: Variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)" },
  show: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.05, ease: EASE } },
};

export const plateImageVariants: Variants = {
  hidden: { scale: 1.14, y: "4%" },
  show: { scale: 1, y: "0%", transition: { duration: 1.25, ease: EASE } },
};

/** Type rising out from behind its own edge — the masked-line reveal. */
export const maskedLineVariants: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.85, ease: EASE } },
};

/** Generic content lift used for the card's information block. */
export const liftVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Container that hands its children a staggered entrance. */
export function stagger(step = STAGGER, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren } },
  };
}

/**
 * Reduced-motion equivalents. The page stays fully legible and still acknowledges
 * arrival with a plain fade — only the travel and the masking are removed.
 */
export const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
};

export const staticVariants: Variants = {
  hidden: {},
  show: {},
};

/** Picks between the rich and the reduced variant sets at the call site. */
export function pick(reduce: boolean, rich: Variants, reduced: Variants = reducedVariants): Variants {
  return reduce ? reduced : rich;
}
