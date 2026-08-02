"use client";

import { StatusScene } from "@/components/system/status-scene";

/**
 * Planned downtime.
 *
 * A real route so operations has somewhere to point traffic during a deploy or a
 * migration, rather than letting people meet a raw gateway error. Deliberately states
 * that data is untouched — the first fear when a financial product is unreachable is
 * that something was lost.
 */
export default function MaintenancePage() {
  return (
    <StatusScene
      titleKey="status.maintenance.title"
      bodyKey="status.maintenance.body"
      actions={[{ labelKey: "status.action.retry", onClick: () => location.reload(), primary: true }]}
    />
  );
}
