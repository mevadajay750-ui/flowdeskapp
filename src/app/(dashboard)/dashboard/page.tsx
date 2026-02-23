"use client";

import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <Card className="bg-flowdesk-gradient text-white shadow-md">
          <div className="space-y-2">
            <p className="text-sm font-medium opacity-90">
              Welcome back, <span className="font-semibold">{user.name}</span>{" "}
              👋
            </p>
            <p className="text-xs opacity-90">
              Here&apos;s what&apos;s happening today across your workspace.
            </p>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-white">
            <div className="text-xs font-medium uppercase tracking-wide text-textSecondary">
              Total Members
            </div>
            <div className="mt-3 text-3xl font-semibold text-textPrimary">
              0
            </div>
            <p className="mt-1 text-xs text-textSecondary">
              Member analytics will appear here as you grow the team.
            </p>
          </Card>
          <Card className="bg-white">
            <div className="text-xs font-medium uppercase tracking-wide text-textSecondary">
              Pending Approvals
            </div>
            <div className="mt-3 text-3xl font-semibold text-textPrimary">
              0
            </div>
            <p className="mt-1 text-xs text-textSecondary">
              Track new signups waiting for review.
            </p>
          </Card>
          <Card className="bg-white">
            <div className="text-xs font-medium uppercase tracking-wide text-textSecondary">
              Total Projects
            </div>
            <div className="mt-3 text-3xl font-semibold text-textPrimary">
              0
            </div>
            <p className="mt-1 text-xs text-textSecondary">
              Project insights and workload distribution will surface here.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-flowdesk-gradient text-white shadow-md">
        <div className="space-y-2">
          <p className="text-sm font-medium opacity-90">
            Welcome back, <span className="font-semibold">{user.name}</span> 👋
          </p>
          <p className="text-xs opacity-90">
            Here&apos;s what&apos;s happening today.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <div className="mb-3 text-sm font-semibold text-textPrimary">
            Assigned Projects
          </div>
          <p className="text-sm text-textSecondary">
            You don&apos;t have any assigned projects yet. Once projects are
            assigned, they&apos;ll appear here with key details and next steps.
          </p>
        </Card>
        <Card className="bg-white">
          <div className="mb-3 text-sm font-semibold text-textPrimary">
            My Logged Hours
          </div>
          <p className="text-sm text-textSecondary">
            Timesheet summaries will be shown here, including total hours,
            billable vs non-billable, and trends over time.
          </p>
        </Card>
      </div>
    </div>
  );
}


