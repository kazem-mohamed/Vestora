"use client";

import { MessageCircle } from "lucide-react";
import { PillButton } from "@/components/ui/pill-button";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";

/**
 * "Message" launcher — deep-links into the inbox with a thread pre-opened for
 * {userId}. Hidden for guests and on your own identity.
 */
export function MessageLauncher({
  userId,
  labelKey = "msg.message",
  variant = "outline",
  size = "default",
  className,
}: {
  userId: number;
  labelKey?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const me = useAuthStore((s) => s.user);
  const { t } = useLocale();
  if (!me || me.id === userId) return null;

  return (
    <PillButton
      href={`/messages?to=${userId}`}
      variant={variant}
      size={size}
      showArrow={false}
      className={className}
    >
      <MessageCircle className="size-4" strokeWidth={1.75} />
      {t(labelKey)}
    </PillButton>
  );
}
