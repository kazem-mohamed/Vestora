"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  LogOut,
  Pencil,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authApi } from "@/lib/api/auth";
import { avatarUrl } from "@/lib/api/users";
import { homeFor, homeLabelKeyFor, roleLabelKeyFor } from "@/lib/nav/role-nav";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The account menu.
 *
 * Five identical rows is what this was, and the trouble with five identical rows is
 * that the one people actually reach for — the way back to their own workspace —
 * carried exactly the same weight as "edit profile". So it is lifted out into a plate
 * of its own with the role's glyph and an arrow, and the remaining three sit beneath
 * as quiet rows. One primary, three secondary, one exit.
 *
 * It deliberately does not list Browse, Portfolio or Watchlist. Those live in the
 * header nav and the mobile drawer; repeating them here is what would turn the menu
 * into a third copy of the navigation — the mini-sidebar failure this shape avoids.
 * What the menu owns is identity: who you are signed in as, and as which role, which
 * is the question it gets opened to answer.
 */
export function ProfileMenu() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const Arrow = rtl ? ArrowLeft : ArrowRight;
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  if (!user) return null;

  const isAdmin = user.userType === "Admin";

  async function signOut() {
    try {
      await authApi.logout();
    } catch {
      /* logging out locally is enough even if the call fails */
    }
    clearSession();
    router.push("/login");
  }

  const rows = [
    { icon: User, labelKey: "nav.profile", href: `/u/${user.id}` },
    { icon: Pencil, labelKey: "nav.editProfile", href: "/settings/profile" },
    { icon: ShieldCheck, labelKey: "pset.tab.account", href: "/settings/account" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-cursor="hover"
        aria-label={t("nav.profile")}
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border transition-[box-shadow,transform] duration-300 hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {!failed ? (
          <img
            src={avatarUrl(user.id)}
            alt=""
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-primary" style={{ fontFamily: "var(--font-heading)" }}>
            {initials(user.userName)}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[17rem] overflow-hidden p-0">
        {/* ---- Identity plate. The gold hairline is the only ornament, and it is what
                makes this read as a plate rather than a first menu row. ---- */}
        <div className="relative bg-gradient-to-b from-primary/[0.06] to-transparent px-3.5 pb-3.5 pt-4">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-primary/30">
              {!failed ? (
                <img src={avatarUrl(user.id)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="text-[13px] text-primary"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {initials(user.userName)}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold leading-tight"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {user.userName}
              </p>
              {/* The role, because which half of the marketplace you stand in changes
                  what every other surface shows you — and nothing said it until now. */}
              <span
                className={cn(
                  "mt-1 inline-block rounded-full border border-primary/25 px-2 py-px text-[10px] text-primary",
                  rtl ? "" : "uppercase tracking-[0.14em]"
                )}
              >
                {t(roleLabelKeyFor(user))}
              </span>
            </div>
          </div>
          <p className="mt-2.5 truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>

        {/* ---- The primary destination, given the weight it earns. ---- */}
        <div className="px-1.5 pb-1.5">
          <button
            type="button"
            data-cursor="hover"
            onClick={() => router.push(homeFor(user))}
            className={cn(
              "group/home flex w-full items-center gap-2.5 rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 text-start outline-none",
              "transition-[border-color,background-color] duration-300 hover:border-primary/45 hover:bg-primary/[0.05]",
              "focus-visible:ring-3 focus-visible:ring-ring/25"
            )}
          >
            {isAdmin ? (
              <Shield className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
            ) : (
              <LayoutDashboard className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
            )}
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
              {t(homeLabelKeyFor(user))}
            </span>
            <Arrow
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-[transform,color] duration-300 group-hover/home:text-primary",
                rtl ? "group-hover/home:-translate-x-0.5" : "group-hover/home:translate-x-0.5"
              )}
            />
          </button>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <DropdownMenuItem key={r.href} onClick={() => router.push(r.href)}>
                <Icon className="size-4" />
                {t(r.labelKey)}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuItem variant="destructive" onClick={signOut}>
            <LogOut className="size-4" />
            {t("nav.logout")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
