import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  Compass,
  Landmark,
  LayoutDashboard,
  Briefcase,
  Rocket,
  Shield,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth/store";

export interface NavLink {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

/**
 * The destinations a given role actually needs from anywhere in the product.
 *
 * One source of truth shared by the desktop header, the mobile menu and the
 * avatar dropdown — so a role can never be offered a link in one surface and
 * denied it in another, and nobody is sent to a page that will greet them with
 * "this role only".
 */
export function navLinksFor(user: AuthUser | null | undefined): NavLink[] {
  const browse: NavLink = { href: "/projects", labelKey: "nav.browse", icon: Compass };

  if (!user) return [browse];

  switch (user.userType) {
    case "Investor":
      return [
        browse,
        { href: "/invest", labelKey: "nav.dashboard", icon: LayoutDashboard },
        { href: "/invest/portfolio", labelKey: "nav.portfolio", icon: Briefcase },
        { href: "/invest/watchlist", labelKey: "nav.saved", icon: Bookmark },
      ];

    case "Innovator":
      // "Find capital" is a permanent entry, not a contextual one: discovering who
      // could back the round is part of raising it, not an occasional errand. This is
      // the founder's half of the marketplace, and it was missing entirely.
      return [
        browse,
        { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
        { href: "/dashboard/ventures", labelKey: "mine.title", icon: Rocket },
        { href: "/investors", labelKey: "cap.nav", icon: Landmark },
        { href: "/projects?saved=1", labelKey: "nav.saved", icon: Bookmark },
      ];

    case "Admin":
      // No watchlist: a moderator has no investing shortlist to keep.
      return [
        browse,
        { href: "/admin", labelKey: "nav.admin", icon: Shield },
      ];

    default:
      return [browse];
  }
}

/**
 * Where a signed-in user belongs when they ask for "my home" — the landing
 * page's CTA, the avatar menu, and the post-login redirect all resolve here.
 */
export function homeFor(user: AuthUser | null | undefined): string {
  if (!user) return "/projects";
  if (user.userType === "Investor") return "/invest";
  if (user.userType === "Admin") return "/admin";
  if (user.userType === "Innovator") return "/dashboard";
  return "/projects";
}

/** Label for that home, so the CTA reads correctly per role. */
export function homeLabelKeyFor(user: AuthUser | null | undefined): string {
  if (user?.userType === "Admin") return "nav.admin";
  return "nav.dashboard";
}

/** How a role is named to the person holding it. */
export function roleLabelKeyFor(user: AuthUser | null | undefined): string {
  if (user?.userType === "Innovator") return "profile.role.innovator";
  if (user?.userType === "Admin") return "profile.role.admin";
  return "profile.role.investor";
}
