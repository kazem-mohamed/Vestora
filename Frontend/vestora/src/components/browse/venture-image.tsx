"use client";

import Image from "next/image";
import { projectImageUrl } from "@/lib/api/projects";
import { cn } from "@/lib/utils";

/**
 * Venture cover art.
 *
 * Routed through next/image so the browser is served a resized, modern-format
 * file at the size it will actually paint. The raw endpoint returns the
 * founder's original upload — up to 400 KB and 1536px wide — which the browse
 * grid was previously downloading in full for every tile.
 *
 * Ventures without artwork get a monogram plate built from the house gradient
 * rather than a stock placeholder, so an empty slot still looks deliberate.
 */
export function VentureImage({
  imageId,
  name,
  sizes,
  priority,
  className,
  monogramSize = "6rem",
}: {
  imageId: number | null;
  name: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  monogramSize?: string;
}) {
  if (imageId == null) {
    return (
      <div
        aria-hidden
        className={cn("relative h-full w-full overflow-hidden", className)}
        style={{
          backgroundImage:
            "radial-gradient(120% 120% at 12% 0%, color-mix(in oklab, var(--primary) 24%, transparent), transparent 58%), radial-gradient(120% 120% at 100% 100%, color-mix(in oklab, var(--bronze) 26%, transparent), transparent 58%)",
        }}
      >
        <span
          className="absolute bottom-1 start-4 select-none leading-none text-foreground/[0.07]"
          style={{ fontFamily: "var(--font-heading)", fontSize: monogramSize }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={projectImageUrl(imageId)}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className={className}
    />
  );
}
