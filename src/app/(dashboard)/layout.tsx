"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, loading, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized || loading) return;

    if (!user || user.status !== "approved" || !user.role) {
      router.replace("/login");
    }
  }, [initialized, loading, user, router]);

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-textSecondary">
        <div className="rounded-2xl border border-border bg-white px-6 py-4 shadow-sm">
          <p className="text-sm">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || user.status !== "approved" || !user.role) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}


