"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { VentureCard } from "@/components/browse/venture-card";
import { viewThreshold } from "@/lib/browse/signals";
import { EASE, stepDelay } from "@/lib/browse/motion";
import { projectsApi } from "@/lib/api/projects";
import { useLocale } from "@/lib/i18n/locale";

/**
 * The way out of a venture page.
 *
 * The page used to end on a Report link: a reader who decided "not this one"
 * had nothing but the back button. This offers the founder's other rounds
 * first — the strongest signal we hold, since interest in a founder survives
 * a "no" on one venture — and falls back to the same sector only when the
 * founder has nothing else running, so the row never pads itself.
 *
 * Renders nothing at all when there is nothing honest to suggest.
 */
export function NextVentures({
  projectId,
  ownerId,
  ownerName,
}: {
  projectId: number;
  ownerId: number;
  ownerName: string;
}) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion() ?? false;

  const { data } = useQuery({
    queryKey: ["next-ventures", projectId],
    queryFn: () => projectsApi.nextVentures(projectId),
    staleTime: 5 * 60_000,
  });

  const byFounder = data?.byFounder ?? [];
  const bySector = data?.bySector ?? [];
  const items = byFounder.length > 0 ? byFounder : bySector;
  const fromFounder = byFounder.length > 0;

  const threshold = useMemo(() => viewThreshold(items), [items]);

  if (items.length === 0) return null;

  return (
    <section className="border-t border-border pt-16 sm:pt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {fromFounder
              ? t("proj.next.byFounder").replace("{name}", ownerName)
              : t("proj.next.bySector")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {fromFounder ? t("proj.next.byFounderHint") : t("proj.next.bySectorHint")}
          </p>
        </div>

        <Link
          href={fromFounder ? `/u/${ownerId}` : "/projects"}
          data-cursor="hover"
          className="group/all link-underline inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-primary"
        >
          {fromFounder ? t("proj.next.allByFounder") : t("proj.next.browseAll")}
          <Arrow className="size-3.5 transition-transform duration-300 group-hover/all:translate-x-0.5 group-hover/all:rtl:-translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((p, i) => (
          <motion.div
            key={p.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: stepDelay(i % 3), ease: EASE }}
          >
            <VentureCard project={p} index={i} viewThreshold={threshold} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
