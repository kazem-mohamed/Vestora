"use client";

import { ReactLenis } from "lenis/react";
import { CustomCursor } from "@/components/motion/cursor";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingSplash } from "@/components/landing/landing-splash";
import { LandingHero } from "@/components/landing/landing-hero";
import { StatsSection } from "@/components/landing/stats-section";
import { AboutSection } from "@/components/landing/about-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturedProjects } from "@/components/landing/featured-projects";
import { WhyVestora } from "@/components/landing/why-vestora";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <ReactLenis root>
      <div className="cursor-showpiece relative bg-background text-foreground">
        {/* Held over the fold until the footage and the webfont have both
            landed, so the page arrives once instead of assembling on screen. */}
        <LandingSplash />
        <CustomCursor />
        {/* Fixed at page level (not inside the hero) so it stays viewport-pinned
            past the hero's scale/round transform, which would otherwise become
            its containing block. */}
        <LandingNav />
        {/* The hero pins to the viewport (sticky, z-0) and recedes while the
            page sheet below rides up and covers it — the opening curtain. */}
        <LandingHero />
        <div className="relative z-10 rounded-t-[2.5rem] bg-background shadow-[0_-28px_60px_-32px_rgba(0,0,0,0.55)] md:rounded-t-[3.5rem]">
          <StatsSection />
          <AboutSection />
          <HowItWorks />
          <FeaturedProjects />
          <WhyVestora />
          <TestimonialsSection />
          {/* One full-viewport closing stage: Guilloché medallion + ambient
              light in place of the old looping video, editorial statement,
              asymmetric nav.

              `showCta` was off, so the page built ten screens, arrived at its
              own climax — a 48px line inside a turning medallion with a
              cursor-tracked spotlight — and then offered nothing to do. The
              CTA is on, and it is the two-door choice: the only place on the
              page where a founder and an investor are finally told apart. */}
          <Footer variant="stage" showCta />
        </div>
      </div>
    </ReactLenis>
  );
}
