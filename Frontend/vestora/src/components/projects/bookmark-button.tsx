"use client";

import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { useBookmarkIds, useToggleBookmark } from "@/lib/hooks/use-bookmarks";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/**
 * Save/unsave toggle. Reads the shared id set, toggles optimistically, and pops
 * + fills gold on save. Hidden for guests (bookmarks require auth). `variant`
 * "overlay" sits on top of card/hero imagery; "surface" sits on a solid panel.
 */
export function BookmarkButton({
  projectId,
  variant = "overlay",
  className,
}: {
  projectId: number;
  variant?: "overlay" | "surface";
  className?: string;
}) {
  const { t } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { data: ids } = useBookmarkIds();
  const toggle = useToggleBookmark();

  if (!user) return null;

  const saved = (ids ?? []).includes(projectId);

  return (
    <motion.button
      type="button"
      data-cursor="hover"
      aria-label={saved ? t("bookmark.saved") : t("bookmark.save")}
      aria-pressed={saved}
      whileTap={{ scale: 0.82 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ projectId, saved });
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-300",
        variant === "overlay"
          ? "bg-black/35 text-white hover:bg-black/50"
          : "border border-border bg-card/70 text-muted-foreground hover:text-foreground",
        saved && "ring-1 ring-primary/50",
        className
      )}
    >
      <motion.span
        key={saved ? "on" : "off"}
        initial={false}
        animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <Bookmark
          className={cn(
            "size-[18px] transition-colors duration-300",
            saved ? "fill-primary text-primary" : ""
          )}
          strokeWidth={1.75}
        />
      </motion.span>
    </motion.button>
  );
}
