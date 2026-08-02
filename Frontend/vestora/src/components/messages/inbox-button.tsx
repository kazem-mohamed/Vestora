"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useUnreadCount } from "@/lib/hooks/use-chat";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";

/** Header inbox icon with a live unread badge. Hidden when logged out. */
export function InboxButton() {
  const user = useAuthStore((s) => s.user);
  const { t } = useLocale();
  const { data: count = 0 } = useUnreadCount();

  if (!user) return null;

  return (
    <Link
      href="/messages"
      aria-label={t("msg.title")}
      data-cursor="hover"
      className="relative grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-300 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      <MessageSquare className="size-[18px]" strokeWidth={1.75} />
      {count > 0 && (
        <>
          <motion.span
            aria-hidden
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            // Logical inset, not `right-*`: in Arabic the badge belongs on the other
            // side of the glyph, and this one used to stay pinned to the right while
            // the bell beside it correctly flipped.
            className="font-numeric absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
          <span className="sr-only">{count}</span>
        </>
      )}
    </Link>
  );
}
