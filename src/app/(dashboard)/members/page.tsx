"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  query,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";

import { db } from "@/app/firebase";
import type { AppUser, UserRole } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

export default function MembersPage() {
  const { user, loading } = useAuthStore();
  const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const q = query(
          collection(db, "users"),
          where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        const users: AppUser[] = [];
        snapshot.forEach((d) => {
          users.push(d.data() as AppUser);
        });
        setPendingUsers(users);
      } catch (err) {
        console.error(err);
        setError("Failed to load pending members.");
      } finally {
        setFetching(false);
      }
    };

    load();
  }, []);

  const handleDecision = async (
    targetUid: string,
    action: "approve" | "reject",
    role?: UserRole
  ) => {
    setError(null);
    setActionLoading(targetUid + "-" + action);

    try {
      const userRef = doc(db, "users", targetUid);

      if (action === "approve") {
        if (!role) return;
        await updateDoc(userRef, {
          status: "approved",
          role,
        });
      } else {
        await updateDoc(userRef, {
          status: "rejected",
        });
      }

      setPendingUsers((current) =>
        current.filter((member) => member.uid !== targetUid)
      );
    } catch (err) {
      console.error(err);
      setError("Unable to update member. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading your profile...</div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Members</h1>
        <p className="mt-2 text-sm text-textSecondary">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-textPrimary">Members</h1>
      <p className="mt-2 text-sm text-textSecondary">
        Review and approve new accounts.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-white">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-textSecondary">
                Name
              </th>
              <th className="px-4 py-2 text-left font-medium text-textSecondary">
                Email
              </th>
              <th className="px-4 py-2 text-left font-medium text-textSecondary">
                Designation
              </th>
              <th className="px-4 py-2 text-left font-medium text-textSecondary">
                ID Proof
              </th>
              <th className="px-4 py-2 text-left font-medium text-textSecondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fetching ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-textSecondary"
                >
                  Loading pending members...
                </td>
              </tr>
            ) : pendingUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-sm text-textSecondary"
                >
                  No pending members.
                </td>
              </tr>
            ) : (
              pendingUsers.map((member) => (
                <tr key={member.uid}>
                  <td className="px-4 py-3 text-sm text-textPrimary">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-textSecondary">
                      {member.contactNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-textSecondary">
                    {member.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-textSecondary">
                    {member.designation}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {member.idProofUrl ? (
                      <Link
                        href={member.idProofUrl}
                        target="_blank"
                        className="text-primary hover:text-primary-dark"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-textSecondary">Not uploaded</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          actionLoading === member.uid + "-approve" ||
                          actionLoading === member.uid + "-reject"
                        }
                        onClick={() =>
                          handleDecision(member.uid, "approve", "employee")
                        }
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {actionLoading === member.uid + "-approve"
                          ? "Approving..."
                          : "Approve as Employee"}
                      </button>
                      <button
                        type="button"
                        disabled={
                          actionLoading === member.uid + "-approve" ||
                          actionLoading === member.uid + "-reject"
                        }
                        onClick={() =>
                          handleDecision(member.uid, "approve", "freelancer")
                        }
                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Approve as Freelancer
                      </button>
                      <button
                        type="button"
                        disabled={
                          actionLoading === member.uid + "-approve" ||
                          actionLoading === member.uid + "-reject"
                        }
                        onClick={() => handleDecision(member.uid, "reject")}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

