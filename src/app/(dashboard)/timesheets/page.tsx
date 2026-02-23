"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/app/firebase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Timesheet, TimesheetStatus } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

function getStatusStyles(status: TimesheetStatus) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";
    case "pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function formatStatusLabel(status: TimesheetStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function TimesheetsPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin-specific state
  const [statusFilter, setStatusFilter] = useState<TimesheetStatus | "all">(
    "all"
  );
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setFetching(true);
      setError(null);

      try {
        let snapshot;

        if (user.role === "admin") {
          const q = query(
            collection(db, "timesheets"),
            orderBy("createdAt", "desc")
          );
          snapshot = await getDocs(q);
        } else {
          const q = query(
            collection(db, "timesheets"),
            where("userId", "==", user.uid),
            orderBy("date", "desc")
          );
          snapshot = await getDocs(q);
        }

        const items: Timesheet[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Timesheet, "id">;
          items.push({
            id: docSnap.id,
            ...data,
          });
        });

        setTimesheets(items);
      } catch (err) {
        console.error(err);
        setError("Failed to load timesheets.");
      } finally {
        setFetching(false);
      }
    };

    if (!loading && user) {
      void load();
    }
  }, [loading, user]);

  const isAdmin = user?.role === "admin";

  const projectOptions = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, string>();
    timesheets.forEach((t) => {
      if (!map.has(t.projectId)) {
        map.set(t.projectId, t.projectName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [isAdmin, timesheets]);

  const userOptions = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, string>();
    timesheets.forEach((t) => {
      if (!map.has(t.userId)) {
        map.set(t.userId, t.userName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [isAdmin, timesheets]);

  const filteredTimesheets = useMemo(() => {
    if (!isAdmin) {
      return timesheets;
    }

    return timesheets.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) {
        return false;
      }
      if (projectFilter !== "all" && t.projectId !== projectFilter) {
        return false;
      }
      if (userFilter !== "all" && t.userId !== userFilter) {
        return false;
      }
      return true;
    });
  }, [isAdmin, timesheets, statusFilter, projectFilter, userFilter]);

  const handleApprove = async (timesheetId: string) => {
    setActionLoadingId(timesheetId);
    try {
      await updateDoc(doc(db, "timesheets", timesheetId), {
        status: "approved",
        updatedAt: serverTimestamp(),
      });

      setTimesheets((current) =>
        current.map((t) =>
          t.id === timesheetId ? { ...t, status: "approved" } : t
        )
      );
    } catch (err) {
      console.error(err);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Failed to approve timesheet. Please try again.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const openRejectModal = (timesheetId: string) => {
    setRejectError(null);
    setRejectionComment("");
    setRejectingId(timesheetId);
  };

  const closeRejectModal = () => {
    setRejectingId(null);
    setRejectionComment("");
    setRejectError(null);
  };

  const handleReject = async () => {
    if (!rejectingId) return;

    if (!rejectionComment.trim()) {
      setRejectError("Please provide a rejection comment.");
      return;
    }

    setActionLoadingId(rejectingId);
    setRejectError(null);

    try {
      await updateDoc(doc(db, "timesheets", rejectingId), {
        status: "rejected",
        rejectionComment: rejectionComment.trim(),
        updatedAt: serverTimestamp(),
      });

      setTimesheets((current) =>
        current.map((t) =>
          t.id === rejectingId
            ? {
                ...t,
                status: "rejected",
                rejectionComment: rejectionComment.trim(),
              }
            : t
        )
      );

      closeRejectModal();
    } catch (err) {
      console.error(err);
      setRejectError("Failed to reject timesheet. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading your timesheets...</div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Timesheets</h1>
          <p className="mt-1 text-sm text-textSecondary">
            {isAdmin
              ? "Review and manage timesheets across all projects. Use filters to focus on specific users, projects, or statuses."
              : "View and manage your submitted timesheets. You can edit entries while they are pending approval."}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            router.push("/timesheets/create");
          }}
        >
          Log Time
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {isAdmin && (
        <Card className="rounded-2xl shadow-sm">
          <div className="flex flex-wrap gap-4 px-4 py-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-textSecondary">
                Status
              </label>
              <select
                className="min-w-[140px] rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as TimesheetStatus | "all")
                }
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-textSecondary">
                Project
              </label>
              <select
                className="min-w-[180px] rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="all">All projects</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-textSecondary">
                User
              </label>
              <select
                className="min-w-[180px] rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="all">All users</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {fetching ? (
        <Card className="text-sm text-textSecondary">
          Loading timesheets...
        </Card>
      ) : filteredTimesheets.length === 0 ? (
        <EmptyState
          title={isAdmin ? "No timesheets yet" : "No logged hours"}
          description={
            isAdmin
              ? "As people start logging time, you’ll see submissions here for review."
              : "You haven’t logged any time yet. Create your first timesheet to track today’s work."
          }
          actionLabel={isAdmin ? undefined : "Log time"}
          onActionClick={
            isAdmin
              ? undefined
              : () => {
                  window.location.href = "/timesheets/create";
                }
          }
        />
      ) : (
        <Card className="rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {isAdmin && (
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                      User
                    </th>
                  )}
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                    Project
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                    Hours
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                    Status
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-textSecondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {filteredTimesheets.map((t) => (
                  <tr key={t.id} className="align-top">
                    {isAdmin && (
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-textPrimary">
                        {t.userName}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-textPrimary">
                      {t.date
                        ? new Date(t.date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-textPrimary">
                      {t.projectName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-textPrimary">
                      {typeof t.hours === "number"
                        ? t.hours.toFixed(2).replace(/\.00$/, "")
                        : t.hours}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusStyles(
                            t.status
                          )}`}
                        >
                          {formatStatusLabel(t.status)}
                        </span>
                        {t.status === "rejected" && t.rejectionComment && (
                          <p className="max-w-xs text-[11px] text-red-700">
                            {t.rejectionComment}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!isAdmin && t.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/timesheets/${t.id}/edit`)
                            }
                          >
                            Edit
                          </Button>
                        )}

                        {isAdmin && t.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={actionLoadingId === t.id}
                              onClick={() => handleApprove(t.id)}
                            >
                              {actionLoadingId === t.id
                                ? "Approving..."
                                : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoadingId === t.id}
                              onClick={() => openRejectModal(t.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isAdmin && rejectingId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-textPrimary">
              Reject timesheet
            </h2>
            <p className="mt-1 text-xs text-textSecondary">
              Add a short note explaining why this timesheet is being rejected.
              The user will see this message.
            </p>

            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-medium text-textSecondary">
                Rejection comment
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
              />
              {rejectError && (
                <p className="text-xs text-red-600">{rejectError}</p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={closeRejectModal}
                disabled={actionLoadingId === rejectingId}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={handleReject}
                disabled={actionLoadingId === rejectingId}
              >
                {actionLoadingId === rejectingId ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

