/**
 * Vestora's legal and policy documents, as structured data.
 *
 * Held as data rather than six hand-built pages so they share one surface, one table of
 * contents, one motion language and one set of RTL rules — and so a change to how a
 * document reads is a change in one place.
 *
 * <h2>On the content itself</h2>
 * Every clause here describes what Vestora actually does. The platform does not hold
 * funds, provide escrow, verify identities, audit companies, guarantee returns or give
 * financial advice — so nothing below claims otherwise, and several clauses exist
 * specifically to say so plainly. This is written for a real product; it is not legal
 * counsel and not a compliance certification.
 *
 * <h2>On payments</h2>
 * Vestora now runs a payment flow, and it is a <b>simulation</b>. The provider operates
 * in test mode, no real funds are transferred at any point, and the platform is not
 * licensed to handle real money. Saying that plainly here — rather than leaving the
 * older "Vestora processes no payments of any kind" language in place — is the only
 * honest option: a product whose terms contradict its own interface is worse than one
 * with no terms at all.
 */

export type LegalSlug =
  | "terms"
  | "privacy"
  | "cookies"
  | "risk"
  | "guidelines"
  | "accessibility";

export interface LegalSection {
  /** Stable anchor id — used by the table of contents and deep links. */
  id: string;
  heading: string;
  /** Paragraphs. Rendered with whitespace preserved so lists can use "— " prefixes. */
  body: string[];
  /** Optional emphasised statement, set apart as an engraved aside. */
  note?: string;
}

export interface LegalDocument {
  slug: LegalSlug;
  /** Short label for the hub and the in-document switcher. */
  label: string;
  title: string;
  /** One line stating what this document is for. */
  summary: string;
  updated: string;
  sections: LegalSection[];
}

const UPDATED = "30 July 2026";

// ---------------------------------------------------------------------------

const terms: LegalDocument = {
  slug: "terms",
  label: "Terms of Service",
  title: "Terms of Service",
  summary: "What Vestora is, what it is not, and the rules of using it.",
  updated: UPDATED,
  sections: [
    {
      id: "what-vestora-is",
      heading: "What Vestora is",
      body: [
        "Vestora is an introduction and relationship platform. Founders publish rounds they are raising; investors state what they back and can express interest in a specific round. Where both sides agree, Vestora gives them a shared workspace to hold the conversation, the questions and the documents.",
        "Where a founder and an investor settle on an amount, the founder can request those funds through the platform and the investor can complete a checkout. Every one of those transactions is simulated — see \"Payments are simulated\" below.",
      ],
      note: "Vestora holds no funds and provides no escrow. Amounts shown as committed are stated intentions; amounts shown as funded are simulated transactions in a payment provider's test mode.",
    },
    {
      // The clause that used to sit in the doc's opening note, promoted to a section
      // of its own — a payment flow that exists needs more than a parenthetical.
      id: "payments-simulated",
      heading: "Payments are simulated",
      body: [
        "Vestora includes a funding and payment flow: a founder may request the agreed amount, and an investor may complete a checkout to settle it. The interface, the transaction records, the receipts and the platform's own revenue figures all behave as a real system would.",
        "None of it moves real money. The payment provider runs in test mode, no card is ever charged, no funds reach any founder, and no balance held anywhere changes. Vestora is a student project and is not licensed, registered or authorised to handle real payments, hold client money, or operate as a payment institution in any jurisdiction.",
        "Anything labelled as funded, as platform revenue, or as founder proceeds is therefore a record of a simulated transaction. It confers no ownership, no debt, no equity, no entitlement, and no legal or financial right of any kind on anyone.",
      ],
      note: "Payment functionality on Vestora is simulated and runs in test mode. No real funds are transferred at any point.",
    },
    {
      id: "not-advice",
      heading: "Nothing here is financial advice",
      body: [
        "Nothing on Vestora — no listing, ordering, filter, badge, count or signal — is a recommendation, an endorsement, or advice to invest. Sort orders reflect recorded activity, not merit.",
        "Vestora is not a broker, dealer, adviser, or intermediary in any transaction. Any decision to commit capital is yours alone, and any real agreement you reach is between you and the other party, off the platform.",
      ],
    },
    {
      id: "accounts",
      heading: "Accounts and eligibility",
      body: [
        "You need an account to express interest, message anyone, or publish a round. You must give an accurate name and a working email, and you are responsible for what happens under your account.",
        "You may close your account at any time from account settings. Closing it withdraws your listings and revokes your sessions. Records shared with another party — commitments, conversations, endorsements — survive, because the other party holds their half of them.",
      ],
    },
    {
      id: "listings",
      heading: "Publishing a round",
      body: [
        "A round is reviewed by a Vestora administrator before it becomes public. Review means a person looked at the listing for obvious fraud, abuse or incoherence.",
        "Review is not diligence. It is not verification of your company, your figures, your team or your claims. You are responsible for the accuracy of everything you publish, and for keeping it current.",
      ],
      note: "An approved listing means \"a moderator saw no reason to block this\". It is not a Vestora opinion on the venture.",
    },
    {
      id: "conduct",
      heading: "Conduct",
      body: [
        "Do not misrepresent who you are, what you have built, or what you have raised. Do not solicit outside the purpose of the platform. Do not harass anyone, and do not use another member's documents or data beyond evaluating the round they shared them for.",
        "The Community Guidelines set this out in full and form part of these terms.",
      ],
    },
    {
      id: "moderation",
      heading: "Moderation and suspension",
      body: [
        "Vestora may decline, unpublish or remove a listing, and may suspend or close an account, where these terms or the guidelines are broken. Where a listing is rejected the reason is given to its owner so it can be corrected and resubmitted.",
        "Administrative actions are recorded in an internal audit log.",
      ],
    },
    {
      id: "liability",
      heading: "Liability",
      body: [
        "Vestora is provided as it is. The platform makes no warranty about the conduct, solvency, honesty or outcomes of any member, and no warranty that any round will be funded or any commitment honoured.",
        "To the extent the law allows, Vestora is not liable for losses arising from decisions you make, agreements you enter, or the acts of other members.",
      ],
    },
    {
      id: "changes",
      heading: "Changes",
      body: [
        "These terms may change as the platform does. Material changes will be surfaced in the product, not only posted here.",
      ],
    },
  ],
};

const privacy: LegalDocument = {
  slug: "privacy",
  label: "Privacy",
  title: "Privacy Policy",
  summary: "What Vestora stores, why, who can see it, and what stays private.",
  updated: UPDATED,
  sections: [
    {
      id: "what-we-hold",
      heading: "What Vestora holds",
      body: [
        "Account details you give us: name, email, password (stored only as a bcrypt hash — never in a readable form), date of birth, phone, and anything you add to your profile such as a bio, links, sectors or an investment thesis.",
        "What you publish: rounds, updates, roadmap milestones, team entries, documents, images, comments and endorsements.",
        "What you do: support requests and their stage, questions and answers inside a deal, document requests, saved searches, bookmarks, follows, messages, and notifications.",
        "Technical records: page views on a venture (with a hashed fingerprint of IP and browser for anonymous visitors), refresh tokens, sign-in attempts, and a security log of sensitive account events.",
      ],
    },
    {
      id: "public-vs-private",
      heading: "What is public and what is not",
      body: [
        "Public to anyone, signed in or not: an approved, open round and everything on its page; your name, role, bio, links and — for investors — your stated thesis and cheque range; the ventures you own or have backed; and endorsements you have written.",
        "Visible only to the other party in a relationship: messages, the questions and answers in a deal room, document requests, and documents you marked for backers only.",
        "Never shown to anyone else: your private notes on a relationship, your email address, your phone number, and the individual amounts you personally committed.",
      ],
      note: "Each side's private note on a relationship is exactly that. The other party never receives it, and it is not included in any export or preview.",
    },
    {
      id: "discovery",
      heading: "Being discoverable",
      body: [
        "Investors appear in the capital directory so founders can find them. That is the point of stating a mandate — but it is refusable. Turning off directory listing removes you from it while keeping your mandate for the relationships and pipelines that rely on it. Your profile stays reachable by direct link.",
      ],
    },
    {
      id: "link-previews",
      heading: "Link previews",
      body: [
        "When a Vestora link is shared, the preview is built from information already public on that page — a venture's name, sector and cover image, or a member's name, role and stated thesis. No private data, no email addresses and no financial figures are placed in preview metadata.",
      ],
    },
    {
      id: "email",
      heading: "Email",
      body: [
        "Vestora sends email for two things only: confirming your address, and resetting your password. Product activity — a request arriving, a question answered, a round closing — is delivered in the app, not by email.",
      ],
    },
    {
      id: "retention",
      heading: "Keeping and deleting",
      body: [
        "Closing your account marks it deleted, hides you from the platform, withdraws your listings and revokes every session. Records shared with another party are retained, because deleting them would erase the other party's own history.",
        "Security and administrative logs are retained as a record of what was done and by whom.",
      ],
    },
    {
      id: "your-controls",
      heading: "Your controls",
      body: [
        "You can edit or remove what you published, choose which notifications you receive, withdraw from the capital directory, change your password, and close your account — all from within the product.",
      ],
    },
  ],
};

const cookies: LegalDocument = {
  slug: "cookies",
  label: "Cookies & Storage",
  title: "Cookies & Local Storage",
  summary: "What Vestora keeps in your browser. It is a short list.",
  updated: UPDATED,
  sections: [
    {
      id: "no-tracking",
      heading: "No advertising or tracking cookies",
      body: [
        "Vestora runs no advertising, no third-party analytics and no cross-site trackers. There is nothing to consent to because there is nothing being collected for those purposes.",
      ],
      note: "This is why you have never seen a cookie banner on Vestora. There is no non-essential storage to ask about.",
    },
    {
      id: "what-is-stored",
      heading: "What is stored, and why",
      body: [
        "A refresh token, so you stay signed in between visits. Removing it signs you out.",
        "Your language choice and your light or dark preference, so the interface opens the way you left it.",
        "Short-lived session values that make browsing feel continuous — the scroll position you return to, and the last venture you opened.",
      ],
    },
    {
      id: "clearing",
      heading: "Clearing it",
      body: [
        "Clearing your browser's site data for Vestora removes all of the above. You will be signed out and the interface will revert to its defaults. Nothing on your account is affected.",
      ],
    },
  ],
};

const risk: LegalDocument = {
  slug: "risk",
  label: "Risk Disclosure",
  title: "Risk Disclosure",
  summary: "Read this before committing to anything you find here.",
  updated: UPDATED,
  sections: [
    {
      id: "capital-at-risk",
      heading: "Early-stage investing can lose you everything",
      body: [
        "Most early-stage ventures fail. If you back one and it fails, the ordinary outcome is that you do not get your money back — not part of it, none of it.",
        "There is no protection scheme behind anything on this platform, no insurance, and no route to recovery if a venture stops trading.",
      ],
      note: "Do not commit money you cannot afford to lose entirely.",
    },
    {
      id: "no-guarantees",
      heading: "Vestora guarantees nothing",
      body: [
        "Vestora does not guarantee returns, does not guarantee that a round will complete, and does not guarantee that any commitment stated on the platform will be honoured by either side.",
        "A round shown as fully committed means the stated commitments add up to the goal. A round shown as funded means simulated transactions add up to the goal. Neither means real money has moved.",
      ],
    },
    {
      id: "simulated-figures",
      heading: "The money figures are simulated",
      body: [
        "Every amount Vestora describes as funded — on a venture page, in a portfolio, on a receipt, or in the platform's own revenue reporting — comes from a payment provider running in test mode. No card is charged and no funds are transferred.",
        "Do not read a funded total as evidence that a venture has capital, that an investor has parted with money, or that either party owes the other anything. It is a record of a simulation.",
      ],
      note: "Payment functionality on Vestora is simulated and runs in test mode. No real funds are transferred at any point.",
    },
    {
      id: "illiquidity",
      heading: "You cannot easily get out",
      body: [
        "Private holdings are illiquid. There is no market on Vestora to sell into, no secondary trading, and typically no way to exit until a sale or a public listing — which may never happen.",
        "Your position can also be diluted by later rounds on terms you do not control.",
      ],
    },
    {
      id: "your-own-diligence",
      heading: "Diligence is yours",
      body: [
        "Vestora reviews listings for abuse before publishing them. It does not audit financials, verify traction, confirm identities, or check that a team is who it says it is.",
        "Documents in a data room are supplied by the founder and are not independently checked. Treat everything you read here as a claim to be verified, and take your own professional advice.",
      ],
    },
    {
      id: "off-platform",
      heading: "Real agreements happen off Vestora",
      body: [
        "Any actual investment is arranged directly between you and the other party, under your own contracts. Vestora is not a party to it, holds no funds, and has no role in enforcing it.",
        "Completing a simulated payment on Vestora does not create, replace or evidence such an agreement.",
      ],
    },
  ],
};

const guidelines: LegalDocument = {
  slug: "guidelines",
  label: "Community Guidelines",
  title: "Community Guidelines",
  summary: "How members are expected to treat each other here.",
  updated: UPDATED,
  sections: [
    {
      id: "be-accurate",
      heading: "Be accurate",
      body: [
        "State your traction, your team and your raise as they actually are. Do not imply commitments you do not have, backers you have not secured, or revenue you have not earned.",
        "If something material changes — a co-founder leaves, a number was wrong, the round closes — update the listing.",
      ],
    },
    {
      id: "answer-people",
      heading: "Answer the people who engage",
      body: [
        "A support request left unread for weeks is worse than a decline. Approve it, decline it with a reason, or say you need time.",
        "The same applies to questions in a deal room. Both sides can see what is outstanding, and so can you.",
      ],
    },
    {
      id: "respect-material",
      heading: "Respect what you are shown",
      body: [
        "Documents shared with you in a deal room were shared for evaluating that round. Do not forward them, publish them, or use them for anything else.",
        "Vestora records who opened which document. That record exists so founders can see engagement, and it also means misuse is traceable.",
      ],
    },
    {
      id: "endorsements",
      heading: "Endorse only what you witnessed",
      body: [
        "Endorsements can only be written by someone who actually backed a fully committed round, and they describe the working relationship — whether the founder communicated, was straight about risk, and delivered on the roadmap.",
        "Do not trade endorsements, and do not endorse a founder you did not work with.",
      ],
      note: "This is why Vestora has no star ratings. A score out of five can be manufactured; a specific statement from a named backer of a specific round is harder to fake and more useful to read.",
    },
    {
      id: "no-harassment",
      heading: "No harassment, no spam",
      body: [
        "Approach founders and investors about the substance of a round. Do not send bulk identical outreach, do not pursue someone who has declined, and do not use the platform to sell unrelated services.",
        "Harassment, discrimination and abuse end an account.",
      ],
    },
    {
      id: "reporting",
      heading: "Reporting",
      body: [
        "Every venture page has a report action. Reports reach the moderation queue with the context of what you were looking at. If something is fraudulent, report it rather than engaging with it.",
      ],
    },
  ],
};

const accessibility: LegalDocument = {
  slug: "accessibility",
  label: "Accessibility",
  title: "Accessibility",
  summary: "What Vestora has built for access, and what is still open.",
  updated: UPDATED,
  sections: [
    {
      id: "commitment",
      heading: "The intent",
      body: [
        "Vestora should be usable with a keyboard, with a screen reader, at a large text size, and without motion. That is treated as part of building a surface, not a pass afterwards.",
      ],
    },
    {
      id: "what-is-in-place",
      heading: "What is in place",
      body: [
        "— Every interactive control is reachable by keyboard and shows a visible focus ring.",
        "— Menus and dialogs manage focus, close on Escape, and are announced with the right roles.",
        "— Headings follow a real document structure, so a screen reader can navigate a long venture page by section.",
        "— Touch targets on interactive controls are at least 44px.",
        "— Counts and status changes are announced through live regions rather than colour alone.",
        "— The interface works in English and Arabic, with genuine right-to-left layout rather than mirrored text.",
      ],
    },
    {
      id: "motion",
      heading: "Motion",
      body: [
        "Vestora uses motion deliberately — depth, reveals and transitions carry meaning about hierarchy and state. All of it respects your system's reduced-motion setting: animation is removed while every element stays in its correct final position, so nothing is lost by turning it off.",
      ],
      note: "Reduced motion is a supported path, not a degraded one.",
    },
    {
      id: "known-gaps",
      heading: "Known gaps",
      body: [
        "Charts convey trends visually and are not yet fully described for screen readers; the underlying figures are available as text nearby.",
        "Some long data tables are horizontally scrollable on small screens, which is workable but not ideal.",
        "If you hit a barrier, tell us through Help and it will be treated as a defect rather than a request.",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  terms,
  privacy,
  risk,
  guidelines,
  cookies,
  accessibility,
];

export function findLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((d) => d.slug === slug);
}
