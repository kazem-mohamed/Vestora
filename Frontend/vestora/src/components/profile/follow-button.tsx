"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Plus, UserMinus } from "lucide-react";
import { useFollowingIds, useToggleFollow } from "@/lib/hooks/use-follows";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type Ripple = { id: number; x: number; y: number };

/**
 * Follow / Following toggle with X/LinkedIn-grade feel: the icon + label MORPH
 * between states, a soft RIPPLE radiates from the click point, the button
 * scales on press, and a gold ring POPS when a follow lands. Gold when not
 * following; a quiet outline once you do, which shifts to a destructive
 * "Unfollow" on hover. Hidden for guests and on your own profile. Reads the
 * shared following-id set and toggles optimistically. Respects reduced-motion.
 */
export function FollowButton({
  userId,
  size = "default",
  className,
}: {
  userId: number;
  size?: "sm" | "default";
  className?: string;
}) {
  const { t } = useLocale();
  const reduce = useReducedMotion();
  const me = useAuthStore((s) => s.user);
  const { data: ids } = useFollowingIds();
  const toggle = useToggleFollow();

  const [hover, setHover] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [pop, setPop] = useState(false);
  const rid = useRef(0);

  const following = (ids ?? []).includes(userId);
  const prevFollowing = useRef(following);

  // Celebratory ring only when a follow lands (false → true), not on unfollow.
  useEffect(() => {
    if (following && !prevFollowing.current && !reduce) {
      setPop(true);
      const timer = setTimeout(() => setPop(false), 620);
      prevFollowing.current = following;
      return () => clearTimeout(timer);
    }
    prevFollowing.current = following;
  }, [following, reduce]);

  if (!me || me.id === userId) return null;

  const state = following ? (hover ? "unfollow" : "following") : "follow";
  const icon =
    state === "follow" ? (
      <Plus className="size-4" strokeWidth={2.2} />
    ) : state === "unfollow" ? (
      <UserMinus className="size-4" strokeWidth={2} />
    ) : (
      <Check className="size-4" strokeWidth={2.4} />
    );
  const label =
    state === "follow"
      ? t("profile.follow")
      : state === "unfollow"
        ? t("profile.unfollow")
        : t("profile.following");

  function addRipple(e: React.PointerEvent<HTMLButtonElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const id = ++rid.current;
    setRipples((p) => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples((p) => p.filter((rp) => rp.id !== id)), 650);
  }

  return (
    <motion.button
      type="button"
      data-cursor="hover"
      aria-pressed={following}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      onPointerDown={addRipple}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={() => toggle.mutate({ userId, following })}
      className={cn(
        "group/follow relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-semibold outline-none transition-[background-color,border-color,color,box-shadow] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-3 focus-visible:ring-ring/40",
        size === "sm" ? "h-9 px-4 text-[0.8rem]" : "h-11 px-6 text-sm",
        following
          ? "border border-border text-foreground hover:border-destructive/50 hover:bg-destructive/[0.05] hover:text-destructive"
          : "gold-cta bg-primary text-primary-foreground shadow-[0_10px_30px_-16px_var(--primary)]",
        className
      )}
    >
      {/* Ripples */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              className={cn(
                "absolute rounded-full",
                following ? "bg-foreground/10" : "bg-white/30"
              )}
              style={{ left: r.x, top: r.y, width: 16, height: 16, marginLeft: -8, marginTop: -8 }}
              initial={{ scale: 0, opacity: 0.55 }}
              animate={{ scale: 12, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      </span>

      {/* Success pop ring */}
      <AnimatePresence>
        {pop && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Icon morph */}
      <span className="relative z-[1] grid size-4 place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={state}
            initial={reduce ? false : { y: 9, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: -9, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="col-start-1 row-start-1"
          >
            {icon}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* Label morph */}
      <span className="relative z-[1] grid min-w-[4rem] justify-items-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            initial={reduce ? false : { y: 9, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: -9, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
