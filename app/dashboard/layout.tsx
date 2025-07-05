import { UserSidebar } from "@/components/layout/user-sidebar";
import { UserHeader } from "@/components/layout/user-header";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <UserSidebar className="hidden md:block" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <UserHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
