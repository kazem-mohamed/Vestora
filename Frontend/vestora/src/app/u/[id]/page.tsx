"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ReactLenis } from "lenis/react";
import { CustomCursor } from "@/components/motion/cursor";
import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileVentures } from "@/components/profile/profile-ventures";
import { TeamMemberships } from "@/components/profile/team-memberships";
import { TrustSignals } from "@/components/signals/trust-signals";
import { usersApi } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale";

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const { t } = useLocale();

  // Same reason as the venture page: the counts and the venture grid answer
  // differently for the owner, so asking before the session settles would cache
  // the anonymous answer under a key that never changes.
  const authStatus = useAuthStore((s) => s.status);
  const signedIn = authStatus === "authenticated";
  const authSettled = signedIn || authStatus === "unauthenticated";

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", userId, signedIn],
    queryFn: () => usersApi.getProfile(userId),
    enabled: Number.isFinite(userId) && authSettled,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  const notFound =
    !Number.isFinite(userId) || (error instanceof ApiError && error.status === 404);

  return (
    <ReactLenis root>
      <div className="cursor-showpiece relative min-h-svh bg-background text-foreground">
        <CustomCursor />
        <SiteHeader />

        {notFound ? (
          <section className="mx-auto max-w-2xl px-6 py-32 text-center">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              {t("profile.notFound.title")}
            </h1>
            <p className="mt-3 text-muted-foreground">{t("profile.notFound.body")}</p>
            <Link
              href="/projects"
              data-cursor="hover"
              className="link-underline mt-8 inline-block text-sm text-foreground"
            >
              {t("proj.detail.back")}
            </Link>
          </section>
        ) : isLoading || !profile ? (
          <div className="animate-pulse">
            <div className="skeleton-shimmer h-[52svh] min-h-[440px]" />
            <div className="mx-auto max-w-6xl px-5 sm:px-10">
              <div className="-mt-24 rounded-[1.75rem] border border-border/70 bg-card/70 p-6 backdrop-blur-2xl sm:-mt-28 sm:p-9">
                <div className="flex items-start gap-5">
                  <div className="-mt-16 size-24 rounded-full bg-foreground/10 ring-4 ring-card sm:-mt-24 sm:size-32" />
                  <div className="space-y-3 pt-1">
                    <div className="h-6 w-40 rounded-full bg-foreground/10" />
                    <div className="h-9 w-56 rounded bg-foreground/10" />
                  </div>
                </div>
                <div className="mt-8 flex gap-9 border-t border-border/60 pt-6">
                  <div className="h-7 w-16 rounded bg-foreground/10" />
                  <div className="h-7 w-16 rounded bg-foreground/10" />
                  <div className="h-7 w-16 rounded bg-foreground/10" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ProfileHero profile={profile} />
            <div className="mx-auto max-w-6xl space-y-16 px-6 py-16 sm:px-10 sm:py-24">
              {/* Placed first, and deliberately narrow: what the platform can prove is
                  the frame a stranger should read the rest of the profile through. */}
              <TrustSignals
                signals={profile.trustSignals}
                subject="person"
                className="max-w-2xl"
              />
              <ProfileVentures profile={profile} />
              <TeamMemberships profile={profile} />
            </div>
          </>
        )}
      </div>
      <Footer />
    </ReactLenis>
  );
}
