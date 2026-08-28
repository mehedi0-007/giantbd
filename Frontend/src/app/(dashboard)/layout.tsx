'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50">
        {/* Responsive Desktop & Mobile Drawer Sidebar */}
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area (Offset by sidebar width 256px on lg+ screens, full width on mobile) */}
        <div className="flex flex-1 flex-col pl-0 lg:pl-64 transition-all duration-200 min-w-0">
          <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
