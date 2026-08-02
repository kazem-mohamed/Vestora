"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";
import { useLocale } from "@/lib/i18n/locale";
import type { PublicProfileDetail } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Ventures where a TeamMember row's email matched this profile's account —
 * linked automatically server-side, nothing for the user to set up. Renders
 * nothing when there's no match, so it never adds an empty section.
 */
export function TeamMemberships({ profile }: { profile: PublicProfileDetail }) {
  const { t } = useLocale();
  const memberships = profile.teamMemberships;
  if (memberships.length === 0) return null;

  return (
    <section>
      <SectionLabel index={2}>{t("profile.section.team")}</SectionLabel>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {memberships.map((m, i) => (
          <motion.div
            key={m.projectId}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: (i % 6) * 0.06, ease: EASE }}
          >
            <Link
              href={`/projects/${m.projectId}`}
              data-cursor="hover"
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card/50 p-5 transition-colors duration-300 hover:border-primary/30"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/[0.06] text-primary">
                <Users className="size-4.5" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p
                  className="truncate font-bold transition-colors group-hover:text-primary"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {m.projectName}
                </p>
                {m.role && <p className="text-xs text-muted-foreground">{m.role}</p>}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
