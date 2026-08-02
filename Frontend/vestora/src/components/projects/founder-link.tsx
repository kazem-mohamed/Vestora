"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { avatarUrl } from "@/lib/api/users";
import {
  FOUNDER_AVATAR_TRANSITION,
  navigateWithVentureMorph,
} from "@/lib/browse/view-transition";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The person behind the venture, with a face.
 *
 * The venture page linked to its founder by name alone, which made the strongest
 * half of the loop — venture to person — the weakest thing on the page. A face
 * is what a reader actually evaluates when deciding whether to back someone, and
 * it gives the navigation a shared element to carry across: this avatar morphs
 * into the profile's hero avatar, the same device Browse already uses to send a
 * venture's plate into the detail hero.
 */
export function FounderLink({
  ownerId,
  ownerName,
  className,
}: {
  ownerId: number;
  ownerName: string;
  className?: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const avatarRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);
  const href = `/u/${ownerId}`;

  return (
    <Link
      href={href}
      data-cursor="hover"
      onClick={(e) => {
        if (
          !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0 &&
          navigateWithVentureMorph(
            avatarRef.current,
            () => router.push(href),
            FOUNDER_AVATAR_TRANSITION
          )
        ) {
          e.preventDefault();
        }
      }}
      className={cn(
        "group/founder flex items-center gap-3 rounded-xl outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/25",
        className
      )}
    >
      <span
        ref={avatarRef}
        className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary ring-1 ring-border transition-transform duration-300 group-hover/founder:scale-105"
      >
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 120% at 25% 15%, color-mix(in oklab, var(--primary) 30%, transparent), transparent 60%)",
          }}
        />
        {!failed ? (
          <img
            src={avatarUrl(ownerId)}
            alt=""
            onError={() => setFailed(true)}
            className="relative h-full w-full object-cover"
          />
        ) : (
          <span
            className="relative text-xs text-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {initials(ownerName)}
          </span>
        )}
      </span>

      <span className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{t("support.led")}</span>
        <span className="flex items-center gap-1 text-sm text-foreground transition-colors duration-300 group-hover/founder:text-primary">
          <span className="truncate">{ownerName}</span>
          <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity duration-300 group-hover/founder:opacity-100" />
        </span>
      </span>
    </Link>
  );
}
