"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AddResidentView from "./add-resident-view";
import ConfigureReportView from "./configure-report-view";
import DashboardOverview from "./dashboard-overview";

export type DashboardView = "overview" | "add-resident" | "configure-report";

function parseView(value: string | null): DashboardView {
  if (value === "add-resident" || value === "configure-report") {
    return value;
  }
  return "overview";
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get("view"));

  function setView(next: DashboardView) {
    if (next === "overview") {
      router.replace("/admin/dashboard", { scroll: false });
      return;
    }
    router.replace(`/admin/dashboard?view=${next}`, { scroll: false });
  }

  if (view === "add-resident") {
    return <AddResidentView onBack={() => setView("overview")} />;
  }

  if (view === "configure-report") {
    return <ConfigureReportView onBack={() => setView("overview")} />;
  }

  return (
    <DashboardOverview
      onAddResident={() => setView("add-resident")}
      onGenerateReport={() => setView("configure-report")}
    />
  );
}

export default function DashboardPageClient() {
  return (
    <Suspense fallback={<DashboardOverview />}>
      <DashboardPageContent />
    </Suspense>
  );
}
