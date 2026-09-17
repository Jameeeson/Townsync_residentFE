import { StaffShell } from "@/components/StaffShell";
import { ToastProvider } from "@/components/Toast";
import { StaffSessionProvider } from "@/contexts/StaffSessionContext";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <StaffSessionProvider>
        <StaffShell>{children}</StaffShell>
      </StaffSessionProvider>
    </ToastProvider>
  );
}
