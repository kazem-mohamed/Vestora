"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { DealRoom } from "@/components/deals/deal-room";

/**
 * One investment relationship.
 *
 * A route rather than a panel inside the pipeline because a relationship is an entity
 * with its own state, its own participants and its own history — it needs to be
 * linkable, and both sides need to be able to return to the same place. Access is
 * granted by participation on the server, so this page never has to decide who may
 * read it; it only has to render what the server was willing to send.
 *
 * Reached contextually (from the pipeline, the requests board, or a notification) and
 * deliberately absent from the main navigation: there is no useful "all deals" nav
 * entry when the relationship lists already live inside each role's own workspace.
 */
export default function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequireAuth>
      <DealRoom investmentId={Number(id)} />
    </RequireAuth>
  );
}
