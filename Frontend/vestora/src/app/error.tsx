"use client";

import { StatusScene } from "@/components/system/status-scene";

/**
 * An unhandled fault inside a route.
 *
 * `reset` re-renders the failed segment, which is genuinely the right first move for a
 * transient failure — so it is the primary action rather than a link away. The error's
 * `digest` is surfaced because it is the one string support can correlate with a server
 * log; the message itself is not shown, since in production it is either useless or
 * revealing.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatusScene
      code="500"
      tone="alert"
      titleKey="status.500.title"
      bodyKey="status.500.body"
      detail={error.digest}
      actions={[
        { labelKey: "status.action.retry", onClick: reset, primary: true },
        { labelKey: "status.action.help", href: "/help" },
      ]}
    />
  );
}
