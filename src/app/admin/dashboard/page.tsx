import AdminShell from "../../../components/admin/admin-shell";
import DashboardPageClient from "../../../components/admin/dashboard-page-client";

export default function DashboardPage() {
  return (
    <AdminShell>
      <DashboardPageClient />
    </AdminShell>
  );
}
