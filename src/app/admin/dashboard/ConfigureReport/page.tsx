import { redirect } from "next/navigation";

export default function ConfigureReportPage() {
  redirect("/admin/dashboard?view=configure-report");
}
