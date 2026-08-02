import { redirect } from "next/navigation";

/**
 * The venture roster now lives inside the founder control room at
 * /dashboard/ventures (same data, plus moderation state and delete). This
 * route is kept as a permanent redirect so existing links and bookmarks
 * still resolve. /my-projects/new and /my-projects/[id]/edit are unaffected.
 */
export default function MyProjectsRedirect() {
  redirect("/dashboard/ventures");
}
