"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight combobox: type freely or pick from suggestions. Any string is a
 * valid value (the backend accepts free text), suggestions just speed entry
 * and keep values consistent.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = value.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q)
    : options;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-input bg-card/60 px-3.5 pe-9 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle suggestions"
          className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg ring-1 ring-foreground/5">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-start text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {opt}
                {value === opt && <Check className="size-3.5 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
