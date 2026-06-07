"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/app/firebase";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Project, ProjectStatus } from "@/types";
import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

function getStatusStyles(status: ProjectStatus) {
  switch (status) {
    case "active":
      return "border-success/30 bg-success/10 text-success";
    case "completed":
      return "border-primary/30 bg-primary/10 text-primary";
    case "on_hold":
      return "border-warning/30 bg-warning/10 text-warning";
    case "archived":
    default:
      return "border-border bg-surface-secondary text-textSecondary";
  }
}

function formatStatusLabel(status: ProjectStatus) {
  if (status === "on_hold") return "On hold";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ProjectsPage() {
  const { user, loading } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setFetching(true);
      setError(null);

      try {
        const canViewAll = hasPermission(user.role, "view_all_projects");

        let snapshot;
        if (canViewAll) {
          // Admin-style view: all projects, filter archived client-side
          snapshot = await getDocs(collection(db, "projects"));
        } else {
          // Limited view: only projects the user is a member of
          const q = query(
            collection(db, "projects"),
            where("memberIds", "array-contains", user.uid)
          );
          snapshot = await getDocs(q);
        }

        const items: Project[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Project, "id">;
          const project: Project = {
            id: docSnap.id,
            ...data,
          };
          items.push(project);
        });

        // Hide archived projects from the main listing
        setProjects(items.filter((p) => p.status !== "archived"));
      } catch (err) {
        console.error(err);
        setError("Failed to load projects.");
      } finally {
        setFetching(false);
      }
    };

    if (!loading && user) {
      void load();
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading your projects...</div>
    );
  }

  if (!user) {
    return null;
  }

  const canCreate = hasPermission(user.role, "create_project");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Projects</h1>
          <p className="mt-1 text-sm text-textSecondary">
            Browse ongoing and upcoming work. You&apos;ll only see projects you
            are assigned to unless you have permission to view all projects.
          </p>
        </div>

        {canCreate && (
          <PermissionGuard permission="create_project" fallback={null}>
            <Link href="/projects/create">
              <Button size="sm">New Project</Button>
            </Link>
          </PermissionGuard>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {fetching ? (
        <Card className="text-sm text-textSecondary">
          Loading projects...
        </Card>
      ) : projects.length === 0 ? (
        <EmptyState
          title={
            hasPermission(user.role, "view_all_projects")
              ? "No projects yet"
              : "No assigned projects"
          }
          description={
            hasPermission(user.role, "view_all_projects")
              ? "Start by creating your first project to track work with your team."
              : "Once an admin assigns you to a project, it will appear here."
          }
          actionLabel={
            hasPermission(user.role, "view_all_projects")
              ? "Create project"
              : undefined
          }
          onActionClick={
            hasPermission(user.role, "view_all_projects")
              ? () => {
                  window.location.href = "/projects/create";
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="flex h-full flex-col rounded-2xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="line-clamp-1 text-sm font-semibold text-textPrimary">
                      {project.name}
                    </h2>
                    <p className="mt-1 text-xs text-textSecondary">
                      {project.clientName}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusStyles(
                      project.status
                    )}`}
                  >
                    {formatStatusLabel(project.status)}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-xs text-textSecondary">
                  {project.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.techStack?.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-textSecondary"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.techStack && project.techStack.length > 4 && (
                    <span className="inline-flex items-center rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-medium text-textSecondary">
                      +{project.techStack.length - 4} more
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-textSecondary">
                  <span>
                    Start:{" "}
                    <span className="font-medium text-textPrimary">
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : "—"}
                    </span>
                  </span>
                  <span>
                    Members:{" "}
                    <span className="font-medium text-textPrimary">
                      {project.members?.length ?? 0}
                    </span>
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

