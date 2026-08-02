"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { EASE_OUT } from "@/lib/browse/motion";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { FacetValue } from "@/lib/types/api";

/**
 * A single filter dimension.
 *
 * Options come from the live inventory with their counts attached, so the menu
 * physically cannot offer a choice that returns nothing — the previous drawer
 * listed 56 categories of which 47 were dead ends.
 */
export function FacetMenu({
  label,
  options,
  selected,
  onSelect,
  allLabel,
}: {
  label: string;
  options: FacetValue[];
  selected?: string;
  onSelect: (value: string | undefined) => void;
  allLabel: string;
}) {
  const { locale } = useLocale();
  const rtl = locale === "ar";
  const reduce = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        wrapRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Roving focus so the whole menu is keyboard-operable.
  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? i + 1 : i - 1;
    items[(next + items.length) % items.length]?.focus();
  }

  if (options.length === 0) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        data-cursor="hover"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 items-center gap-2 rounded-full border px-4 text-sm outline-none transition-colors duration-300",
          "focus-visible:ring-3 focus-visible:ring-ring/25",
          selected
            ? "border-primary/55 bg-primary/[0.08] text-foreground"
            : "border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground"
        )}
      >
        <span className="max-w-[10rem] truncate">{selected ?? label}</span>
        <ChevronDown
          className={cn("size-3.5 shrink-0 transition-transform duration-300", open && "rotate-180")}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={label}
            ref={listRef}
            onKeyDown={onListKeyDown}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            style={{ transformOrigin: rtl ? "top right" : "top left" }}
            className="absolute z-40 mt-2 max-h-80 w-60 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-2xl backdrop-blur-sm"
          >
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-sm outline-none transition-colors",
                "hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.07]",
                !selected && "text-foreground"
              )}
            >
              {allLabel}
              {!selected && <Check className="size-3.5 text-primary" aria-hidden />}
            </button>

            <div className="my-1 h-px bg-border/70" />

            {options.map((opt) => {
              const active = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(active ? undefined : opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-sm outline-none transition-colors",
                    "hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.07]",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="min-w-0 truncate">{opt.value}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-numeric text-[11px] text-muted-foreground/70">
                      {opt.count}
                    </span>
                    {active && <Check className="size-3.5 text-primary" aria-hidden />}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
