import { redirect } from "next/navigation";

/**
 * Maintenance history is no longer a separate tab — it lives inline as the
 * "Your Requests" panel on the main maintenance page. This redirect keeps old
 * links and bookmarks working.
 */
export default function HistoryRedirectPage() {
  redirect("/resident/maintenance");
}
