"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale";

/**
 * Switches the interface language.
 *
 * The label collapses to a two-letter code below `sm`. At 375px the header's action
 * cluster — inbox, notifications, this, the theme toggle and the mobile drawer — ran
 * about 39px past the viewport and pushed the whole page into a horizontal scroll on
 * every authenticated screen. The full word is the widest item in that row and the
 * only one that can shorten without losing meaning.
 */
export function LanguageToggle() {
  const { toggleLocale, t } = useLocale();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      aria-label={t("lang.toggle")}
      className="min-w-11 px-2 sm:min-w-16 sm:px-3"
    >
      <span className="sm:hidden">{t("lang.toggle.short")}</span>
      <span className="hidden sm:inline">{t("lang.toggle")}</span>
    </Button>
  );
}
