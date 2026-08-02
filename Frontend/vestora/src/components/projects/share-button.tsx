"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Link2, Share2 } from "lucide-react";
import {
  FacebookMark,
  LinkedInMark,
  WhatsAppMark,
  XMark,
} from "@/components/brand/channel-marks";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Share a project. On devices with the Web Share API the button opens the native
 * sheet directly; otherwise it opens a small popover (copy link + channels).
 * Channels carry their official brand marks, tinted in `currentColor` and only taking
 * the brand colour on hover — four saturated logos at rest would be the loudest thing
 * on the page.
 */
export function ShareButton({
  title,
  path,
  variant = "overlay",
}: {
  title: string;
  path: string;
  variant?: "overlay" | "surface";
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const url =
    typeof window !== "undefined" ? window.location.origin + path : path;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const channels: {
    key: string;
    label: string;
    href: string;
    Mark: (p: { className?: string }) => React.ReactElement;
    /** Brand colour, applied on hover only. */
    hover: string;
  }[] = [
    {
      key: "whatsapp",
      label: t("share.whatsapp"),
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      Mark: WhatsAppMark,
      hover: "group-hover/ch:text-[#25D366]",
    },
    {
      key: "x",
      label: t("share.x"),
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      Mark: XMark,
      hover: "group-hover/ch:text-foreground",
    },
    {
      key: "linkedin",
      label: t("share.linkedin"),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      Mark: LinkedInMark,
      hover: "group-hover/ch:text-[#0A66C2]",
    },
    {
      key: "facebook",
      label: t("share.facebook"),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      Mark: FacebookMark,
      hover: "group-hover/ch:text-[#1877F2]",
    },
  ];

  async function onClick() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or unsupported — fall through to popover
      }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("share.copied"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t("share.copyFailed"));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-cursor="hover"
        aria-label={t("share.title")}
        onClick={onClick}
        className={cn(
          "flex size-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors duration-300",
          variant === "overlay"
            ? "bg-black/35 text-white hover:bg-black/50"
            : "border border-border bg-card/70 text-muted-foreground hover:text-foreground"
        )}
      >
        <Share2 className="size-[17px]" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute end-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl ring-1 ring-foreground/5"
          >
            <button
              type="button"
              onClick={copy}
              data-cursor="hover"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {copied ? (
                <Check className="size-4 text-primary" />
              ) : (
                <Link2 className="size-4 text-muted-foreground" />
              )}
              {copied ? t("share.copied") : t("share.copy")}
            </button>

            <div className="my-1 h-px bg-border/70" />

            {channels.map((c) => (
              <a
                key={c.key}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                data-cursor="hover"
                className="group/ch flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <c.Mark
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-colors duration-300",
                    c.hover
                  )}
                />
                <span className="min-w-0 flex-1">{c.label}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-300 group-hover/ch:-translate-y-0.5 group-hover/ch:translate-x-0.5 rtl:group-hover/ch:-translate-x-0.5" />
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
