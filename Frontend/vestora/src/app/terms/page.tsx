import { redirect } from "next/navigation";

/**
 * `/terms` predates the policy hub, and is linked from registration, how-it-works and
 * anywhere members have already shared it. It redirects into the hub rather than being
 * deleted, so no existing link breaks and there is only ever one copy of the document.
 *
 * What used to live here was a heading and a single paragraph — the template this pass
 * set out to remove.
 */
export default function TermsRedirect() {
  redirect("/legal/terms");
}
