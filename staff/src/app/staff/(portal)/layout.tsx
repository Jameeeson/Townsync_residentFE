import { StaffShell } from "@/components/StaffShell";
import { ToastProvider } from "@/components/Toast";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <StaffShell>{children}</StaffShell>
    </ToastProvider>
  );
}
