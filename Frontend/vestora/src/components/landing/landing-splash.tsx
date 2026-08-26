"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLenis } from "lenis/react";
import { BrandLoader } from "@/components/motion/brand-loader";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The curtain over the landing page's first paint.
 *
 * The page opens on a 15 MB video behind a Cinzel headline, and both arrive
 * late: the type reflows as the webfont swaps in, and the hero cuts from
 * poster to footage. Holding one brand-coloured beat over both turns two
 * visible pops into a single deliberate arrival.
 *
 * The ceiling matters more than the wait. Whatever stalls — the footage, the
 * fonts, a dead network — the curtain lifts anyway, so the splash can never
 * become the reason the page is unreachable.
 */
const MAX_WAIT_MS = 4000;
/** Under this the splash reads as a flicker, not an intended moment. */
const MIN_SHOW_MS = 700;

export function LandingSplash() {
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();
  const lenis = useLenis();

  useEffect(() => {
    const startedAt = performance.now();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      const elapsed = performance.now() - startedAt;
      window.setTimeout(() => setDone(true), Math.max(0, MIN_SHOW_MS - elapsed));
    };

    // Warmed here rather than read off the hero's own <video>: that element is
    // owned by a sibling component, and the browser serves it the cached bytes.
    const probe = document.createElement("video");
    probe.muted = true;
    probe.preload = "auto";
    probe.src = "/landing/hero.mp4";

    const footage = new Promise<void>((resolve) => {
      probe.addEventListener("canplay", () => resolve(), { once: true });
      probe.addEventListener("error", () => resolve(), { once: true });
    });

    Promise.all([document.fonts?.ready ?? Promise.resolve(), footage]).then(
      finish
    );
    const ceiling = window.setTimeout(finish, MAX_WAIT_MS);

    return () => {
      window.clearTimeout(ceiling);
      probe.removeAttribute("src");
      probe.load();
    };
  }, []);

  // Nothing underneath may scroll while the curtain is down — including Lenis,
  // which drives this page's scrolling and ignores `overflow: hidden`.
  useEffect(() => {
    if (done) {
      lenis?.start();
      return;
    }
    lenis?.stop();
    window.scrollTo(0, 0);
  }, [done, lenis]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="splash"
          className="dark fixed inset-0 z-[100] grid place-items-center bg-background"
          initial={false}
          exit={reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <BrandLoader />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
