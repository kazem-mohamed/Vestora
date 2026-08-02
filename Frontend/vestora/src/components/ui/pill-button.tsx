"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "default" | "lg";

const base =
  "group/pill relative inline-flex select-none items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap outline-none transition-[transform,box-shadow,filter,color,background-color,border-color] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary:
    "gold-cta bg-primary text-primary-foreground shadow-[0_10px_30px_-16px_var(--primary)]",
  outline:
    "border border-primary/35 text-foreground hover:border-primary/70 hover:bg-primary/[0.06]",
  ghost: "text-foreground hover:bg-foreground/[0.04]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 ps-4 pe-2 text-[0.8rem]",
  default: "h-11 ps-5 pe-2.5 text-sm",
  lg: "h-13 ps-7 pe-3 text-[0.95rem]",
};

const iconWrap: Record<Size, string> = {
  sm: "size-6",
  default: "size-7",
  lg: "size-9",
};

/**
 * The signature Vestora CTA: a pill with a gold fill and an arrow that swaps
 * out top-right / in from bottom-left on hover. Renders a <button> by default,
 * or a next/link when `href` is set. Shared across every surface so the whole
 * app inherits one button language.
 */
export function PillButton({
  children,
  href,
  variant = "primary",
  size = "default",
  showArrow = true,
  className,
  ...props
}: {
  children: React.ReactNode;
  href?: string;
  variant?: Variant;
  size?: Size;
  showArrow?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cn(base, variants[variant], sizes[size], !showArrow && "pe-5", className);

  const inner = (
    <>
      <span className="relative z-[2] inline-flex items-center gap-2">{children}</span>
      {showArrow && (
        <span
          className={cn(
            "relative z-[2] grid shrink-0 place-items-center overflow-hidden rounded-full",
            iconWrap[size],
            variant === "primary" ? "bg-primary-foreground/15" : "bg-primary/12"
          )}
        >
          <ArrowUpRight
            className="col-start-1 row-start-1 size-4 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/pill:translate-x-[140%] group-hover/pill:-translate-y-[140%]"
          />
          <ArrowUpRight
            className="col-start-1 row-start-1 size-4 -translate-x-[140%] translate-y-[140%] transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/pill:translate-x-0 group-hover/pill:translate-y-0"
          />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} data-cursor="hover" className={cls}>
        {inner}
      </Link>
    );
  }

  return (
    <button data-cursor="hover" className={cls} {...props}>
      {inner}
    </button>
  );
}
