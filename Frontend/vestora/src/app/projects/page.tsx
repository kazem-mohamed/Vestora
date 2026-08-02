import { Suspense } from "react";
import { BrowseExperience } from "@/components/browse/browse-experience";
import { BrowseSkeleton } from "@/components/browse/browse-states";

export const metadata = {
  title: "Ventures seeking capital · Vestora",
  description:
    "Explore vetted ventures raising their next round. Filter by stage, sector and location, and follow the ones worth your conviction.",
};

/**
 * Browse is deliberately PUBLIC. The feed it renders is already an anonymous
 * endpoint, the landing page sells it, and nobody can judge a capital platform
 * without seeing a single deal first. Actions that belong to an account —
 * saving, backing, messaging — remain gated inside their own components.
 */
export default function ProjectsPage() {
  return (
    <Suspense fallback={<BrowseFallback />}>
      <BrowseExperience />
    </Suspense>
  );
}

function BrowseFallback() {
  return (
    <div className="min-h-svh bg-background px-6 pt-28">
      <div className="mx-auto max-w-7xl">
        <BrowseSkeleton />
      </div>
    </div>
  );
}
