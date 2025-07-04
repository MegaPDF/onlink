import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminLayout } from "@/components/layout/admin-layout";

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      <div className="flex h-screen">
        <AdminSidebar className="hidden md:block" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
            {children}
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}
