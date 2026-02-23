"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "@/app/firebase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Project, ProjectStatus } from "@/types";
import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

function getStatusStyles(status: ProjectStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "completed":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "on_hold":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "archived":
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatStatusLabel(status: ProjectStatus) {
  if (status === "on_hold") return "On hold";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuthStore();

  const [project, setProject] = useState<Project | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const projectId = params?.id;

  useEffect(() => {
    const load = async () => {
      if (!projectId) return;

      setFetching(true);
      setError(null);

      try {
        const ref = doc(db, "projects", projectId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Project not found.");
          setProject(null);
          return;
        }

        const data = snap.data() as Omit<Project, "id">;
        setProject({
          id: snap.id,
          ...data,
        });
      } catch (err) {
        console.error(err);
        setError("Unable to load project details.");
      } finally {
        setFetching(false);
      }
    };

    void load();
  }, [projectId]);

  const handleArchive = async () => {
    if (!projectId || !project) return;
    if (!user || !hasPermission(user.role, "edit_project")) return;

    // Lightweight confirm to prevent accidental archival
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm(
        "Archive this project? It will be hidden from active listings but not deleted."
      );
      if (!confirmed) {
        return;
      }
    }

    setArchiving(true);
    setError(null);

    try {
      const ref = doc(db, "projects", projectId);
      await updateDoc(ref, {
        status: "archived",
        updatedAt: serverTimestamp(),
      });

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Project archived.");
      }

      router.push("/projects");
    } catch (err) {
      console.error(err);
      setError("Unable to archive project. Please try again.");
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">
        Loading project details...
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="text-sm text-textSecondary">
        No project identifier provided.
      </div>
    );
  }

  const canEdit = user && hasPermission(user.role, "edit_project");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">
            {project ? project.name : "Project"}
          </h1>
          <p className="mt-1 text-sm text-textSecondary">
            View key details, technology stack, and members for this project.
          </p>
        </div>

        {project && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusStyles(
                project.status
              )}`}
            >
              {formatStatusLabel(project.status)}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {fetching ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">Loading project...</p>
        </Card>
      ) : !project ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">
            This project could not be found or you may not have access to it.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="rounded-2xl shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    Client
                  </div>
                  <div className="mt-1 text-sm font-medium text-textPrimary">
                    {project.clientName}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    Timeline
                  </div>
                  <div className="mt-1 text-sm text-textSecondary">
                    <span className="font-medium text-textPrimary">
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : "—"}
                    </span>{" "}
                    <span className="mx-1 text-textSecondary">→</span>
                    <span className="font-medium text-textPrimary">
                      {project.endDate
                        ? new Date(project.endDate).toLocaleDateString()
                        : "Present"}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    Members
                  </div>
                  <div className="mt-1 text-sm text-textPrimary">
                    {project.members?.length ?? 0} member
                    {(project.members?.length ?? 0) === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex flex-col items-end gap-2">
                  <Link href={`/projects/${project.id}/edit`}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full justify-center"
                    >
                      Edit Project
                    </Button>
                  </Link>
                  {project.status !== "archived" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleArchive}
                      disabled={archiving}
                      className="w-full justify-center border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      variant="secondary"
                    >
                      {archiving ? "Archiving..." : "Archive"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                  Description
                </div>
                <p className="mt-2 text-sm leading-relaxed text-textSecondary">
                  {project.description}
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                  Tech Stack
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.techStack?.length ? (
                    project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-textSecondary"
                      >
                        {tech}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-textSecondary">
                      No technologies recorded yet.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <div className="text-xs text-textSecondary">
            <Link
              href="/projects"
              className="font-medium text-primary hover:text-primaryDark"
            >
              Back to projects
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

