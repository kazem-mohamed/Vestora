namespace MyAppApi.Services
{
    /// <summary>
    /// The single source of truth for what a venture's Category may be.
    /// Mirrors <c>Frontend/vestora/src/lib/config/categories.ts</c> — keep the two in
    /// sync. Grounded in real, tangible SME/manufacturing/brand businesses (apparel
    /// makers, factories, existing brands, apps founders want to grow or sell) rather
    /// than abstract startup jargon, and scoped to the Egyptian market this platform
    /// actually serves. Replaces the old free-text Category + Industry pair, which
    /// were never validated and never translated.
    /// </summary>
    public static class ProjectCategories
    {
        public static readonly string[] All =
        {
            "saas", "mobile_app", "web_platform", "ecommerce", "ai", "cybersecurity", "gaming", "hardware_iot",
            "fintech", "islamic_finance", "financial_services", "remittances",
            "healthtech", "wellness_fitness", "edtech",
            "manufacturing", "apparel_manufacturing", "textiles_export", "food_beverage_production", "furniture_crafts",
            "consumer_brand", "fashion_retail", "beauty_personal_care", "retail",
            "restaurants", "hospitality_tourism",
            "ridehailing_delivery", "logistics", "import_export",
            "proptech_realestate", "renewable_energy", "construction", "agriculture",
            "media_marketing", "professional_services", "telecom",
            "social_impact", "govtech",
            "other",
        };

        public const string Other = "other";

        public static bool IsValid(string? category) =>
            !string.IsNullOrWhiteSpace(category) && Array.IndexOf(All, category) >= 0;
    }
}
