import { redirect } from "next/navigation";

/**
 * The single-page portfolio is now a full investor command centre at /invest
 * (overview, pipeline, portfolio, watchlist, activity). Kept as a permanent
 * redirect so existing links and bookmarks still resolve.
 */
export default function PortfolioRedirect() {
  redirect("/invest/portfolio");
}
