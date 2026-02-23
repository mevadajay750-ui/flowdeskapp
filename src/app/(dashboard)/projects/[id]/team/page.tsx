"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/app/firebase";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AppUser, Project, ProjectMember } from "@/types";
import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

interface MemberRow {
  member: ProjectMember;
  user: AppUser | null;
}

function formatAssignedAt(value: any): string {
  if (!value) return "—";
  try {
    // Firestore Timestamp
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleDateString();
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  } catch {
    // ignore
  }
  return "—";
}

function getInitials(name?: string | null, email?: string | null): string {
  const source = name && name.trim().length > 0 ? name : email || "";
  if (!source) return "?";

  const parts = source.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ProjectTeamPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const { user, loading: authLoading } = useAuthStore();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [projectRoleInput, setProjectRoleInput] = useState("");

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const canEdit = useMemo(
    () => !!user && hasPermission(user.role, "edit_project"),
    [user]
  );

  const canViewTeam = useMemo(
    () => !!user && hasPermission(user.role, "manage_members"),
    [user]
  );

  useEffect(() => {
    const load = async () => {
      if (!projectId || authLoading) return;

       if (!canViewTeam) {
        setLoading(false);
        setAccessDenied(true);
        return;
      }

      setLoading(true);
      setError(null);
      setAccessDenied(false);

      try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) {
          setError("Project not found.");
          setProject(null);
          return;
        }

        const data = snap.data() as Omit<Project, "id">;

        // Normalize members into structured objects
        const rawMembers = (data.members || []) as any[];
        const normalizedMembers: ProjectMember[] = rawMembers.map(
          (entry: any): ProjectMember => {
            if (typeof entry === "string") {
              return {
                uid: entry,
                projectRole: "Member",
                assignedAt: data.createdAt,
              };
            }
            return {
              uid: entry.uid,
              projectRole: entry.projectRole || "Member",
              assignedAt: entry.assignedAt ?? data.createdAt,
            };
          }
        );

        const memberIds =
          (data.memberIds && Array.isArray(data.memberIds)
            ? data.memberIds
            : normalizedMembers.map((m) => m.uid)) || [];

        const loadedProject: Project = {
          id: snap.id,
          ...data,
          members: normalizedMembers,
          memberIds,
        };

        if (!user) {
          setAccessDenied(true);
          setProject(loadedProject);
          return;
        }

        const canViewAll = hasPermission(user.role, "view_all_projects");
        const isMember =
          loadedProject.memberIds?.includes(user.uid) ??
          normalizedMembers.some((m) => m.uid === user.uid);

        if (!canViewAll && !isMember) {
          setAccessDenied(true);
          setProject(loadedProject);
          return;
        }

        setProject(loadedProject);

        // Load member profiles
        const uniqueMemberIds = Array.from(
          new Set(normalizedMembers.map((m) => m.uid))
        );

        if (uniqueMemberIds.length > 0) {
          const profileSnaps = await Promise.all(
            uniqueMemberIds.map((uid) => getDoc(doc(db, "users", uid)))
          );

          const profilesByUid = new Map<string, AppUser | null>();
          profileSnaps.forEach((docSnap) => {
            if (docSnap.exists()) {
              profilesByUid.set(docSnap.id, docSnap.data() as AppUser);
            } else {
              profilesByUid.set(docSnap.id, null);
            }
          });

          const rows: MemberRow[] = normalizedMembers.map((entry) => ({
            member: entry,
            user: profilesByUid.get(entry.uid) ?? null,
          }));

          setMembers(rows);
        } else {
          setMembers([]);
        }

        // Fetch available approved users excluding already assigned
        const usersQuery = query(
          collection(db, "users"),
          where("status", "==", "approved")
        );
        const usersSnap = await getDocs(usersQuery);
        const allApproved: AppUser[] = [];

        usersSnap.forEach((d) => {
          allApproved.push(d.data() as AppUser);
        });

        const assignedIds = new Set(uniqueMemberIds);
        const remaining = allApproved.filter(
          (u) => !assignedIds.has(u.uid)
        );

        setAvailableUsers(remaining);
      } catch (err) {
        console.error(err);
        setError("Unable to load project team.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [projectId, authLoading, canViewTeam]);

  const handleAssign = async () => {
    if (!projectId || !project || !selectedUserId || !projectRoleInput.trim()) {
      return;
    }

    if (!canEdit) return;

    setAssigning(true);
    setError(null);

    try {
      const projectRef = doc(db, "projects", projectId);

      const now = new Date();

      await updateDoc(projectRef, {
        members: arrayUnion({
          uid: selectedUserId,
          projectRole: projectRoleInput.trim(),
          assignedAt: now,
        }),
        memberIds: arrayUnion(selectedUserId),
        updatedAt: serverTimestamp(),
      });

      const assignedUser = availableUsers.find(
        (u) => u.uid === selectedUserId
      );

      const newMember: ProjectMember = {
        uid: selectedUserId,
        projectRole: projectRoleInput.trim(),
        assignedAt: now,
      };

      setProject((current) =>
        current
          ? {
              ...current,
              members: [...(current.members || []), newMember],
              memberIds: [
                ...(current.memberIds || []),
                selectedUserId,
              ],
            }
          : current
      );

      setMembers((current) => [
        ...current,
        {
          member: newMember,
          user: assignedUser ?? null,
        },
      ]);

      setAvailableUsers((current) =>
        current.filter((u) => u.uid !== selectedUserId)
      );

      setAssignOpen(false);
      setSelectedUserId("");
      setProjectRoleInput("");

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Member assigned to project.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to assign member. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (uid: string) => {
    if (!projectId || !project) return;
    if (!canEdit) return;

    if (uid === project.createdBy) {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("You cannot remove the project creator from the team.");
      }
      return;
    }

    setRemovingUserId(uid);
    setError(null);

    try {
      const projectRef = doc(db, "projects", projectId);
      const snap = await getDoc(projectRef);

      if (!snap.exists()) {
        setError("Project not found.");
        return;
      }

      const data = snap.data() as Omit<Project, "id">;
      const rawMembers = (data.members || []) as any[];

      const updatedMembers = rawMembers.filter((entry: any) => {
        if (typeof entry === "string") {
          return entry !== uid;
        }
        return entry.uid !== uid;
      });

      const currentMemberIds: string[] =
        (data.memberIds as string[] | undefined) ??
        updatedMembers.map((entry: any) =>
          typeof entry === "string" ? entry : entry.uid
        );

      const updatedMemberIds = currentMemberIds.filter((id) => id !== uid);

      await updateDoc(projectRef, {
        members: updatedMembers,
        memberIds: updatedMemberIds,
        updatedAt: serverTimestamp(),
      });

      setProject((current) =>
        current
          ? {
              ...current,
              members: (current.members || []).filter(
                (member) => member.uid !== uid
              ),
              memberIds: (current.memberIds || []).filter(
                (id) => id !== uid
              ),
            }
          : current
      );

      setMembers((current) =>
        current.filter((row) => row.member.uid !== uid)
      );
    } catch (err) {
      console.error(err);
      setError("Unable to remove member. Please try again.");
    } finally {
      setRemovingUserId(null);
    }
  };

  if (!projectId) {
    return (
      <div className="text-sm text-textSecondary">
        No project identifier provided.
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-4">
        <ProjectTabs projectId={projectId} />
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">Loading team...</p>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="space-y-4">
        <ProjectTabs projectId={projectId} />
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">
            You do not have access to view this project.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">
          Project Team
        </h1>
        <p className="mt-1 text-sm text-textSecondary">
          View and manage who is assigned to this project.
        </p>
      </div>

      <ProjectTabs projectId={projectId} />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <Card className="rounded-2xl shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="text-sm font-medium text-textPrimary">
            Team Members ({members.length})
          </div>
          <PermissionGuard permission="edit_project" fallback={null}>
            <Button
              type="button"
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              Add Member
            </Button>
          </PermissionGuard>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                  Member
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                  Role
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-textSecondary">
                  Assigned
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide text-textSecondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-textSecondary"
                  >
                    No members assigned yet.
                  </td>
                </tr>
              ) : (
                members.map(({ member, user }) => {
                  const isCreator = project?.createdBy === member.uid;
                  const canRemove = canEdit && !isCreator;

                  return (
                    <tr key={member.uid}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {getInitials(user?.name, user?.email)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-textPrimary">
                              {user?.name || "Unknown user"}
                            </div>
                            <div className="text-xs text-textSecondary">
                              {user?.email || member.uid}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
                          {member.projectRole || "Member"}
                        </span>
                        {isCreator && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Owner
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-textSecondary">
                        {formatAssignedAt(member.assignedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PermissionGuard
                          permission="edit_project"
                          fallback={null}
                        >
                          {canRemove && (
                            <button
                              type="button"
                              onClick={() => void handleRemove(member.uid)}
                              disabled={removingUserId === member.uid}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {removingUserId === member.uid
                                ? "Removing..."
                                : "Remove"}
                            </button>
                          )}
                        </PermissionGuard>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {assignOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-textPrimary">
                Assign Member
              </h2>
              <p className="mt-1 text-xs text-textSecondary">
                Select an approved user and define their role for this
                project.
              </p>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-textSecondary">
                  User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select a user</option>
                  {availableUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-textSecondary">
                  Project Role
                </label>
                <input
                  type="text"
                  value={projectRoleInput}
                  onChange={(e) => setProjectRoleInput(e.target.value)}
                  placeholder="e.g. Frontend, Backend, QA"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {availableUsers.length === 0 && (
                <p className="text-xs text-textSecondary">
                  All approved users are already assigned to this project.
                </p>
              )}

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAssignOpen(false);
                  setSelectedUserId("");
                  setProjectRoleInput("");
                }}
              >
                Cancel
              </Button>
              <PermissionGuard permission="edit_project" fallback={null}>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleAssign()}
                  disabled={
                    assigning ||
                    !selectedUserId ||
                    !projectRoleInput.trim()
                  }
                >
                  {assigning ? "Assigning..." : "Assign"}
                </Button>
              </PermissionGuard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

