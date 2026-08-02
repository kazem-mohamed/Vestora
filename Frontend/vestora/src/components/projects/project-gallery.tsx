"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { projectImageUrl } from "@/lib/api/projects";
import { useLocale } from "@/lib/i18n/locale";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Horizontal filmstrip of venture photos; clicking one opens a cinematic
 * lightbox with keyboard navigation (arrows + Esc).
 */
export function ProjectGallery({ imageIds, name }: { imageIds: number[]; name: string }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const [lightbox, setLightbox] = useState<number | null>(null); // index

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % imageIds.length));
      if (e.key === "ArrowLeft")
        setLightbox((i) => (i === null ? i : (i - 1 + imageIds.length) % imageIds.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, imageIds.length]);

  if (imageIds.length === 0) return null;

  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;

  return (
    <section>
      <h2
        className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.35em]"}`}
      >
        {t("proj.detail.gallery")}
      </h2>

      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {imageIds.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => setLightbox(i)}
            data-cursor-text={t("proj.cursor.view")}
            className="group/thumb relative h-56 w-[min(70vw,320px)] shrink-0 snap-start overflow-hidden rounded-xl ring-1 ring-border sm:h-64"
          >
            <img
              src={projectImageUrl(id)}
              alt={`${name} — ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover/thumb:scale-105"
            />
            <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover/thumb:bg-black/15" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              data-cursor="hover"
              aria-label="Close"
              className="absolute end-6 top-6 z-10 flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-[#c7a968] hover:text-[#c7a968]"
            >
              <X className="size-5" />
            </button>

            {imageIds.length > 1 && (
              <>
                <button
                  type="button"
                  data-cursor="hover"
                  aria-label={t("proj.page.prev")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((i) => (i! - 1 + imageIds.length) % imageIds.length);
                  }}
                  className="absolute start-6 z-10 flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-[#c7a968] hover:text-[#c7a968]"
                >
                  <Prev className="size-5" />
                </button>
                <button
                  type="button"
                  data-cursor="hover"
                  aria-label={t("proj.page.next")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox((i) => (i! + 1) % imageIds.length);
                  }}
                  className="absolute end-6 z-10 flex size-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-[#c7a968] hover:text-[#c7a968]"
                >
                  <Next className="size-5" />
                </button>
              </>
            )}

            <motion.img
              key={imageIds[lightbox]}
              src={projectImageUrl(imageIds[lightbox])}
              alt={`${name} — ${lightbox + 1}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[82svh] max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-[#c7a968]/25"
            />

            <p className="font-numeric absolute bottom-6 text-sm text-white/70">
              {lightbox + 1} / {imageIds.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
