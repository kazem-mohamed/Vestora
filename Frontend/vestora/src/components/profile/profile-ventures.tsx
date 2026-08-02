"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Layers, Rocket } from "lucide-react";
import { VentureCard } from "@/components/browse/venture-card";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { SectionLabel } from "@/components/ui/section-label";
import { viewThreshold } from "@/lib/browse/signals";
import { EASE, stepDelay } from "@/lib/browse/motion";
import { projectsApi } from "@/lib/api/projects";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import type { PublicProfileDetail } from "@/lib/types/api";

/**
 * The person's ventures — owned if they build, backed if they invest.
 *
 * Renders the exact card browse renders, from the exact same projection, so a
 * venture reads identically wherever it is met. The bento variant this used to
 * carry gave the same object two different appearances in one session, and its
 * "hero" slot was decided by array index rather than by anything true about the
 * venture.
 */
export function ProfileVentures({ profile }: { profile: PublicProfileDetail }) {
  const { t } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const me = useAuthStore((s) => s.user);
  const isMe = profile.isMe || me?.id === profile.id;
  const isInvestor = profile.userType === "Investor";

  // Keyed on whether we are signed in: the owner is served their unapproved and
  // paused listings here, so the anonymous answer must not be cached over it.
  const signedIn = useAuthStore((s) => s.status) === "authenticated";

  const q = useQuery({
    queryKey: isInvestor
      ? ["profile-backed", profile.id, signedIn]
      : ["profile-ventures", profile.id, signedIn],
    queryFn: () =>
      isInvestor ? usersApi.backedVentures(profile.id) : projectsApi.ownerCards(profile.id),
  });

  const projects = useMemo(() => q.data ?? [], [q.data]);
  const threshold = useMemo(() => viewThreshold(projects), [projects]);

  // Admins have neither ventures nor backings — nothing to show.
  if (profile.userType === "Admin") return null;

  const sectionKey = isInvestor ? "profile.section.backed" : "profile.section.ventures";
  const emptyBase = isInvestor ? "profile.empty.backed" : "profile.empty.ventures";

  return (
    <section>
      <SectionLabel index={1}>{t(sectionKey)}</SectionLabel>

      {q.isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[26rem] animate-pulse rounded-[1.4rem] bg-secondary" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-8">
          <ProfileEmptyState
            icon={isInvestor ? Layers : Rocket}
            title={t(`${emptyBase}.title`)}
            body={t(isMe ? `${emptyBase}.bodyMe` : `${emptyBase}.body`)}
            ctaLabel={isMe ? t(`${emptyBase}.cta`) : undefined}
            ctaHref={isMe ? (isInvestor ? "/projects" : "/my-projects/new") : undefined}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p, i) => (
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
      )}
    </section>
  );
}
