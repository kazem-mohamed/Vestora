"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A background video that costs nothing until it is nearly on screen.
 *
 * The landing page carries four 1080p loops. Every one of them used to be a
 * plain <video autoPlay>, and `autoPlay` overrides `preload="metadata"`: the
 * browser fetched all four to completion the moment the document parsed.
 * Measured on a cold load that was 22.9 MB of video — before a single frame of
 * it was visible — with four simultaneous decodes competing for the same
 * decoder. On a phone it is the same four files.
 *
 * The fix keeps every video exactly where it is. The <video> element is only
 * given its `src` once an IntersectionObserver says the tile is within one
 * viewport of the fold, so the file downloads while the reader is scrolling
 * toward it and is playing by the time it lands. Nothing about the finished
 * page changes; only the order the bytes arrive in does.
 *
 * Off the video path entirely:
 *   • reduced motion   — a still frame is the correct answer, not a paused loop
 *   • no `poster` prop — nothing to show, so nothing is rendered
 *   • decode failure   — falls back to the poster rather than a black hole
 *
 * Playback is also released when the tile leaves the viewport. An off-screen
 * loop still burns decode budget, and four of them is why the page felt heavy
 * on a laptop even after it had finished loading.
 */
export function LazyVideo({
  src,
  poster,
  className,
  /** How far ahead of the fold to begin fetching. One viewport by default. */
  rootMargin = "100% 0px",
}: {
  src: string;
  poster?: string;
  className?: string;
  rootMargin?: string;
}) {
  const reduce = useReducedMotion();
  const holderRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);

  // Arm: load once the tile is within `rootMargin` of the viewport, then stop
  // observing — a video only needs to be armed once.
  useEffect(() => {
    if (reduce) return;
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce, rootMargin]);

  // Play only while actually visible. Separate observer with no margin: the
  // arming one deliberately fires early, this one must not.
  useEffect(() => {
    if (!near || reduce) return;
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      const v = videoRef.current;
      if (!v) return;
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near, reduce]);

  const showStill = reduce || failed || !near;

  return (
    <div ref={holderRef} className={className}>
      {showStill ? (
        poster ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={poster} alt="" className="h-full w-full object-cover" />
        ) : (
          /* No poster: hold the space with the surface tint rather than a
             black rectangle, so the reveal is a fade-in and not a flash. */
          <div className="h-full w-full bg-muted" />
        )
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          // Safari low-power and embedded views ignore the autoplay attribute.
          onLoadedData={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
        />
      )}
    </div>
  );
}
