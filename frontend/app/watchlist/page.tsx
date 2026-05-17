import { redirect } from "next/navigation";

// Watchlist has moved to the profile page
export default function WatchlistRedirect() {
  redirect("/profile");
}
