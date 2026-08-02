"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Extract a YouTube video id from watch/short/embed URL shapes. */
function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
      if (m) return m[2];
    }
  } catch {
    // not a URL
  }
  return null;
}

/** "Watch the film" — opens the venture video in a cinematic modal. */
export function VideoModal({ videoUrl }: { videoUrl: string }) {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const id = youTubeId(videoUrl);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const trigger = (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex size-10 items-center justify-center rounded-full border border-[#c7a968]/60 transition-colors group-hover/watch:border-[#c7a968] group-hover/watch:bg-[#c7a968]/10">
        <Play className="size-3.5 fill-current ps-0.5" />
      </span>
      <span className={`text-sm ${locale === "ar" ? "" : "uppercase tracking-[0.18em]"}`}>
        {t("proj.detail.watch")}
      </span>
    </span>
  );

  // Non-YouTube URLs open in a new tab rather than a broken embed.
  if (!id) {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-cursor="hover"
        className="group/watch text-[#f0eae0] transition-opacity hover:opacity-90"
      >
        {trigger}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-cursor="hover"
        className="group/watch text-[#f0eae0] transition-opacity hover:opacity-90"
      >
        {trigger}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              data-cursor="hover"
              aria-label="Close"
              className="absolute end-6 top-6 flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-[#c7a968] hover:text-[#c7a968]"
            >
              <X className="size-5" />
            </button>
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.5, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-[#c7a968]/30"
            >
              <iframe
                src={`https://www.youtube.com/embed/${id}?autoplay=1`}
                title="Venture film"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
