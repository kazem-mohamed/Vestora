// Whether a user has been through the post-login onboarding step at least
// once. Client-only (localStorage) by design — no backend field for this yet,
// so it's a per-browser gate rather than a durable account flag.
const KEY_PREFIX = "vestora_onboarded_";

export function hasCompletedOnboarding(userId: number): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY_PREFIX + userId) === "1";
}

export function markOnboardingComplete(userId: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_PREFIX + userId, "1");
}
