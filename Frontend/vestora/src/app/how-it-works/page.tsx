import { HowItWorks } from "@/components/how/how-it-works-page";

export const metadata = {
  title: "How Vestora works",
  description:
    "What happens between finding a venture and talking to its founder — and what Vestora deliberately does not do.",
};

/**
 * Public, and deliberately so. The mechanism lived only as a section inside the
 * landing page, which meant nobody could link to it, the sign-up flow could not
 * reference it, and a guest weighing whether to join had no page that answered
 * "what actually happens if I press the button".
 */
export default function HowItWorksPage() {
  return <HowItWorks />;
}
