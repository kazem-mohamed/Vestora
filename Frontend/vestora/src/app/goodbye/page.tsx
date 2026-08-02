"use client";

import { StatusScene } from "@/components/system/status-scene";

/**
 * After an account is closed.
 *
 * The deletion flow previously dropped the person on the landing page, which gives no
 * confirmation that anything happened — an unnerving ending for an irreversible action.
 * This confirms it, and restates what the settings copy already said: shared records
 * (commitments, conversations) survive because the other party keeps their half.
 */
export default function GoodbyePage() {
  return (
    <StatusScene
      titleKey="status.goodbye.title"
      bodyKey="status.goodbye.body"
      actions={[
        { labelKey: "status.action.home", href: "/", primary: true },
        { labelKey: "status.action.help", href: "/help" },
      ]}
    />
  );
}
