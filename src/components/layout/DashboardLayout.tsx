"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

function resolveTitle(pathname: string | null): string {
  if (!pathname) return "Flowdesk";

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "Dashboard";
  }
  if (pathname === "/projects" || pathname.startsWith("/projects/")) {
    return "Projects";
  }
  if (pathname === "/timesheets" || pathname.startsWith("/timesheets/")) {
    return "Timesheets";
  }
  if (pathname === "/members" || pathname.startsWith("/members/")) {
    return "Members";
  }
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "Settings";
  }

  return "Flowdesk";
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  const title = useMemo(() => resolveTitle(pathname), [pathname]);

  return (
    <div className="min-h-screen bg-background text-textPrimary">
      <Sidebar />
      <div className="ml-0 flex min-h-screen flex-1 flex-col md:ml-64">
        <Topbar title={title} />
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

