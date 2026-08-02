// Curated set of common venture categories, shown as suggestions everywhere a
// project's Category is picked or filtered. `Category` stays free text on the
// backend (any string is accepted) — this just gives founders/investors a
// richer, real-world starting list instead of only whatever already exists in
// the database (which starts nearly empty).
export const PROJECT_CATEGORIES = [
  // Software & digital
  "SaaS",
  "Mobile App",
  "Web App",
  "Marketplace",
  "E-commerce",
  "AI",
  "Cybersecurity",
  "Blockchain / Web3",
  "Cloud Services",
  "Hardware",
  "IoT",
  "Robotics",
  "Gaming",

  // Finance
  "FinTech",
  "Financial Services",
  "Banking",
  "Insurance",

  // Health & education
  "HealthTech",
  "Biotech",
  "Pharmaceuticals",
  "Wellness & Fitness",
  "EdTech",

  // Industry & manufacturing
  "Manufacturing",
  "Automotive",
  "Aerospace & Space",
  "Construction",

  // Media & marketing
  "Media & Entertainment",
  "Publishing",
  "Advertising & Marketing",

  // Logistics & property
  "Logistics",
  "Transportation",
  "PropTech",
  "Real Estate",

  // Consumer, food & retail
  "Retail",
  "Wholesale & Distribution",
  "Consumer Products",
  "Fashion & Apparel",
  "Beauty & Personal Care",
  "Food & Beverage",
  "Restaurants & Hospitality",
  "Travel & Tourism",

  // Agriculture & environment
  "Agriculture",
  "CleanTech",
  "Energy",
  "Renewable Energy",
  "Waste Management",

  // Professional & business services
  "B2B Services",
  "Legal Services",
  "Consulting",
  "HR & Recruitment",
  "Telecommunications",
  "Import & Export",

  // Social & general
  "Social Impact",
  "Non-profit / NGO",
  "Government / GovTech",
  "Technology",
];

/** Curated list plus any legacy values already used in the database, deduped. */
export function mergeCategories(fromApi: string[] | undefined): string[] {
  const extra = (fromApi ?? []).filter((c) => !PROJECT_CATEGORIES.includes(c));
  return [...PROJECT_CATEGORIES, ...extra];
}
