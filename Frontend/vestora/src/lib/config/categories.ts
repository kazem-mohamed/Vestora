// The single closed list of venture categories.
//
// Replaces two free-text fields (Category + Industry) that let the same
// clothing brand be typed "Fashion", "Apparel" and "Retail" by three
// different founders and displayed as raw English on an Arabic screen either
// way. A stable key here is translated through category.<key> in
// dictionaries.ts, so the list is the source of truth for what a venture is
// allowed to be classified as — mirrored on the backend by
// Services/ProjectCategories.cs, which is what actually enforces it.
//
// Grounded in what Vestora's founders described themselves as, not a
// generic startup taxonomy: alongside the digital-product categories,
// "General Manufacturing" exists precisely because a factory doesn't always
// make one named kind of thing, and "Clothing & Apparel Design/Manufacturing"
// and "Consumer Brand / Product" exist because a clothing designer or an
// existing brand looking to grow is exactly who this platform is for, not
// an edge case of it.
export const PROJECT_CATEGORIES = [
  // Technology & digital
  "saas",
  "mobile_app",
  "web_platform",
  "ecommerce",
  "ai",
  "cybersecurity",
  "gaming",
  "hardware_iot",

  // Finance
  "fintech",
  "islamic_finance",
  "financial_services",
  "remittances",

  // Health & education
  "healthtech",
  "wellness_fitness",
  "edtech",

  // Manufacturing & production
  "manufacturing",
  "apparel_manufacturing",
  "textiles_export",
  "food_beverage_production",
  "furniture_crafts",

  // Consumer brands & retail
  "consumer_brand",
  "fashion_retail",
  "beauty_personal_care",
  "retail",

  // Food & hospitality
  "restaurants",
  "hospitality_tourism",

  // Mobility, logistics & trade
  "ridehailing_delivery",
  "logistics",
  "import_export",

  // Real estate, energy & construction
  "proptech_realestate",
  "renewable_energy",
  "construction",
  "agriculture",

  // Media & services
  "media_marketing",
  "professional_services",
  "telecom",

  // Social & government
  "social_impact",
  "govtech",

  // Escape hatch. A closed list needs one — without it, the one venture that
  // genuinely doesn't fit has nowhere to go.
  "other",
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export function isProjectCategory(value: string | null | undefined): value is ProjectCategory {
  return !!value && (PROJECT_CATEGORIES as readonly string[]).includes(value);
}

/** The translation key for a category value. Falls back to "other" for anything not recognised
 *  (legacy free-text data from before this list existed), rather than rendering a raw key. */
export function categoryLabelKey(value: string | null | undefined): string {
  return `category.${isProjectCategory(value) ? value : "other"}`;
}

/**
 * For fields that store category keys loosely rather than enforcing them — an
 * investor's `PreferredIndustries` is comma-separated free text that happens to hold
 * category keys for anyone who onboarded after this list existed, and arbitrary older
 * text for anyone who didn't. A known key is translated; anything else is shown as
 * written rather than collapsed to "Other" and losing what the person actually typed.
 */
export function categoryOrRawLabel(value: string, t: (key: string) => string): string {
  return isProjectCategory(value) ? t(`category.${value}`) : value;
}
