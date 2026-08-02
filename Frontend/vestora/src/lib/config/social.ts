import { InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from "@/components/brand/social-icons";

/**
 * Real accounts pending — every href below is a placeholder. Swap the four
 * URLs here when the real ones are ready; nothing else in the app references
 * a social URL directly.
 */
export const SOCIAL_LINKS = [
  { name: "LinkedIn", href: "https://linkedin.com/company/vestora", icon: LinkedinIcon },
  { name: "X", href: "https://x.com/vestora", icon: XIcon },
  { name: "Instagram", href: "https://instagram.com/vestora", icon: InstagramIcon },
  { name: "YouTube", href: "https://youtube.com/@vestora", icon: YoutubeIcon },
] as const;
