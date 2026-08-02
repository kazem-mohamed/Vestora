"use client";

/**
 * Shared-element morph between a venture's plate on Browse and its detail hero,
 * built on the browser's native View Transitions API.
 *
 * React's <ViewTransition> component needs a canary React build; this project is
 * on stable 19.2, so we drive the platform API directly. Where it is missing the
 * navigation simply happens without the morph — nothing else changes.
 *
 * The transition name is applied to ONE element immediately before navigating
 * rather than left on every card, so the browser only ever captures the pair
 * actually taking part.
 */

export const VENTURE_IMAGE_TRANSITION = "venture-image";

/** The founder's face travelling between a venture page and their profile. */
export const FOUNDER_AVATAR_TRANSITION = "founder-avatar";

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (document as ViewTransitionDocument).startViewTransition === "function"
  );
}

/**
 * Tags `element` as the morph source and runs `navigate` inside a view
 * transition. Returns true when it took over, so the caller can let the click
 * proceed normally otherwise.
 */
export function navigateWithVentureMorph(
  element: HTMLElement | null,
  navigate: () => void,
  name: string = VENTURE_IMAGE_TRANSITION
): boolean {
  const doc = document as ViewTransitionDocument;
  if (!element || !supportsViewTransitions() || prefersReducedMotion()) return false;

  element.style.viewTransitionName = name;

  const transition = doc.startViewTransition!(() => {
    navigate();
  });

  // Release the name once the morph is over, so a return to Browse starts clean.
  transition.finished.finally(() => {
    element.style.viewTransitionName = "";
  });

  return true;
}

/** Marks the arriving element as the morph target for the duration of the entrance. */
export function tagVentureMorphTarget(
  element: HTMLElement | null,
  name: string = VENTURE_IMAGE_TRANSITION
) {
  if (!element || !supportsViewTransitions() || prefersReducedMotion()) return;
  element.style.viewTransitionName = name;
  // The name must be free again before the next navigation captures anything.
  const release = () => {
    element.style.viewTransitionName = "";
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(release));
  } else {
    release();
  }
}
