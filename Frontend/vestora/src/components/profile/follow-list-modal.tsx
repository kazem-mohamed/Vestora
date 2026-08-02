"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FollowButton } from "@/components/profile/follow-button";
import { ProfileEmptyState } from "@/components/profile/profile-empty-state";
import { followsApi } from "@/lib/api/follows";
import { avatarUrl } from "@/lib/api/users";
import { useLocale } from "@/lib/i18n/locale";
import type { PublicUserProfile } from "@/lib/types/api";

export type FollowMode = "followers" | "following";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function Row({ u, onNavigate }: { u: PublicUserProfile; onNavigate: () => void }) {
  const { t } = useLocale();
  const [failed, setFailed] = useState(false);
  const roleKey =
    u.userType === "Innovator"
      ? "profile.role.innovator"
      : u.userType === "Admin"
        ? "profile.role.admin"
        : "profile.role.investor";

  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-foreground/[0.04]">
      <Link
        href={`/u/${u.id}`}
        onClick={onNavigate}
        data-cursor="hover"
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
          {!failed ? (
            <img
              src={avatarUrl(u.id)}
              alt=""
              onError={() => setFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              {initials(u.userName)}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{u.userName}</span>
          <span className="block text-xs text-muted-foreground">{t(roleKey)}</span>
        </span>
      </Link>
      <FollowButton userId={u.id} size="sm" />
    </li>
  );
}

export function FollowListModal({
  userId,
  mode,
  open,
  onOpenChange,
}: {
  userId: number;
  mode: FollowMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const q = useQuery({
    queryKey: ["follow-list", mode, userId],
    queryFn: () =>
      mode === "followers" ? followsApi.followers(userId) : followsApi.following(userId),
    enabled: open,
  });

  const users = q.data ?? [];
  const titleKey = mode === "followers" ? "profile.followers" : "profile.followingCount";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 max-h-[60vh] overflow-y-auto">
          {q.isLoading ? (
            <ul className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-2 py-2">
                  <span className="size-10 shrink-0 animate-pulse rounded-full bg-secondary" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-32 animate-pulse rounded bg-foreground/10" />
                    <span className="block h-2.5 w-16 animate-pulse rounded bg-foreground/10" />
                  </span>
                </li>
              ))}
            </ul>
          ) : users.length === 0 ? (
            <ProfileEmptyState
              compact
              icon={mode === "followers" ? Users : UserPlus}
              title={t(mode === "followers" ? "profile.empty.followers.title" : "profile.empty.following.title")}
              body={t(mode === "followers" ? "profile.empty.followers.body" : "profile.empty.following.body")}
            />
          ) : (
            <ul className="space-y-1">
              {users.map((u) => (
                <Row key={u.id} u={u} onNavigate={() => onOpenChange(false)} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
