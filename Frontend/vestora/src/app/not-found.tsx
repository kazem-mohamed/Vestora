"use client";

import { StatusScene } from "@/components/system/status-scene";

/**
 * The app-wide 404.
 *
 * Reached by a mistyped URL, a stale link, or `notFound()` from any route. The actions
 * are the two things a lost person actually wants — the open rounds, or the way home —
 * rather than a browser-back suggestion they already know about.
 */
export default function NotFound() {
  return (
    <StatusScene
      code="404"
      titleKey="status.404.title"
      bodyKey="status.404.body"
      actions={[
        { labelKey: "status.action.browse", href: "/projects", primary: true },
        { labelKey: "status.action.home", href: "/" },
      ]}
    />
  );
}
