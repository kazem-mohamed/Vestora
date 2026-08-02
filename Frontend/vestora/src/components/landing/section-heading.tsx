"use client";

import { Reveal } from "@/components/motion/reveal";
import { useLocale } from "@/lib/i18n/locale";

export function SectionHeading({
  eyebrow,
  title,
  center = true,
}: {
  eyebrow: string;
  title: string;
  center?: boolean;
}) {
  const { locale } = useLocale();
  const caps = locale === "ar" ? "" : "uppercase tracking-[0.04em]";
  const track = locale === "ar" ? "" : "uppercase tracking-[0.35em]";

  return (
    <Reveal className={center ? "text-center" : ""}>
      <p className={`text-xs text-primary-ink ${track}`}>{eyebrow}</p>
      {/* `text-3xl sm:text-4xl` capped this at 36px — the smallest H2 on the
          page, on the section that does the most explaining, while `About`
          sat at 72px. Every section heading now takes the same scale step and
          earns its emphasis from position and surface instead. */}
      <h2
        className={`mt-4 font-bold ${caps}`}
        style={{ fontFamily: "var(--font-heading)", fontSize: "var(--fs-h2)" }}
      >
        {title}
      </h2>
      <div className={`rule-gold mt-5 w-24 ${center ? "mx-auto" : ""}`} />
    </Reveal>
  );
}
