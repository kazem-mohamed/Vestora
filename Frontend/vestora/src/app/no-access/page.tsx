"use client";

import { useAuthStore } from "@/lib/auth/store";
import { StatusScene } from "@/components/system/status-scene";
import { homeFor } from "@/lib/nav/role-nav";

/**
 * Signed in, but not for this.
 *
 * Role denial used to bounce silently to the dashboard, which reads as a glitch — the
 * person clicked something and landed somewhere else with no explanation. This says what
 * happened and sends them to the workspace their own role actually has.
 */
export default function NoAccessPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <StatusScene
      code="403"
      titleKey="status.403.title"
      bodyKey="status.403.body"
      actions={[
        { labelKey: "status.action.myWorkspace", href: homeFor(user), primary: true },
        { labelKey: "status.action.browse", href: "/projects" },
      ]}
    />
  );
}
