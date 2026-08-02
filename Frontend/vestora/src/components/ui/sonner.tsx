"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Check, Info, TriangleAlert, X, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale";

/**
 * Toasts, as a Vestora surface.
 *
 * Three things were wrong with the previous setup rather than merely plain. `richColors`
 * was on, which hands presentation to Sonner's own green/red palette — the single
 * biggest reason these read as library output sitting inside the product rather than
 * part of it. The one class the config did apply, `cn-toast`, **was never defined
 * anywhere in the project**, so it styled nothing. And the position was hard-coded to
 * the right, which in Arabic puts the notification on the far side from where the eye
 * finishes a line.
 *
 * Only `success` and `error` are actually called anywhere in Vestora (125 sites between
 * them), so those two are what this is tuned for: a hairline-ruled plate, a small
 * outlined glyph rather than a filled badge, and the message in the reading face. The
 * remaining variants are kept because they cost one line each, and the loading state is
 * needed by the sign-in sequence.
 *
 * Restraint is the brief: a toast is a glance, not an event. No progress bars, no shadow
 * deep enough to read as a dialog, and a duration short enough that it is gone before it
 * becomes furniture.
 */
export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();
  const { locale } = useLocale();
  const rtl = locale === "ar";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // Follows the reading direction instead of always sitting on the right.
      position={rtl ? "top-left" : "top-right"}
      dir={rtl ? "rtl" : "ltr"}
      // Outlined glyphs, not filled badges — the same register as every other
      // status mark in the product. Decorative; the text carries the meaning.
      icons={{
        success: (
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-primary/40 text-primary">
            <Check className="size-3" strokeWidth={2.4} />
          </span>
        ),
        error: (
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-destructive/45 text-destructive">
            <X className="size-3" strokeWidth={2.4} />
          </span>
        ),
        warning: (
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-bronze/45 text-bronze">
            <TriangleAlert className="size-3" strokeWidth={2.2} />
          </span>
        ),
        info: (
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-border text-muted-foreground">
            <Info className="size-3" strokeWidth={2.2} />
          </span>
        ),
        loading: (
          <span className="grid size-5 shrink-0 place-items-center rounded-full border border-primary/30 text-primary">
            <Loader2 className="size-3 animate-spin" strokeWidth={2.4} />
          </span>
        ),
      }}
      toastOptions={{
        // Long enough to finish a sentence, short enough not to linger.
        duration: 4200,
        classNames: {
          toast: "vt-toast",
          title: "vt-toast-title",
          description: "vt-toast-desc",
          actionButton: "vt-toast-action",
          cancelButton: "vt-toast-cancel",
          closeButton: "vt-toast-close",
          error: "vt-toast-error",
          success: "vt-toast-success",
          warning: "vt-toast-warning",
        },
      }}
      {...props}
    />
  );
}
