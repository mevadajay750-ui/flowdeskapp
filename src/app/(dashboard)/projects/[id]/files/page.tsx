"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/app/firebase";
import { FileExplorer } from "@/components/projects/files/FileExplorer";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { listProjectFileItems } from "@/lib/projectFiles";
import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";
import type { Project, ProjectFileItem } from "@/types";

export default function ProjectFilesPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params?.id;
  const folderParam = searchParams.get("folder");

  const { user, loading } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectFileItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentFolderId = useMemo(() => {
    if (!folderParam) return null;
    const folder = items.find(
      (item) => item.id === folderParam && item.type === "folder"
    );
    return folder?.id ?? null;
  }, [folderParam, items]);

  useEffect(() => {
    const load = async () => {
      if (!projectId) return;

      setFetching(true);
      setError(null);

      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setProject(null);
          setItems([]);
          setError("Project not found.");
          return;
        }

        const projectData = {
          id: projectSnap.id,
          ...(projectSnap.data() as Omit<Project, "id">),
        };
        setProject(projectData);

        const fileItems = await listProjectFileItems(projectId);
        setItems(fileItems);
      } catch (err) {
        console.error(err);
        setError("Unable to load project files.");
        setProject(null);
        setItems([]);
      } finally {
        setFetching(false);
      }
    };

    void load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading project files...</div>
    );
  }

  if (!projectId) {
    return (
      <div className="text-sm text-textSecondary">
        No project identifier provided.
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canAccess =
    hasPermission(user.role, "view_all_projects") ||
    project?.memberIds?.includes(user.uid);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">
          {project ? project.name : "Project Files"}
        </h1>
        <p className="mt-1 text-sm text-textSecondary">
          Organize project documentation, pages, and attachments.
        </p>
      </div>

      <ProjectTabs projectId={projectId} />

      {error && <Alert>{error}</Alert>}

      {fetching ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">Loading files...</p>
        </Card>
      ) : !project ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">
            This project could not be found or you may not have access to it.
          </p>
        </Card>
      ) : !canAccess ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">
            You do not have access to this project&apos;s files.
          </p>
        </Card>
      ) : (
        <FileExplorer
          project={project}
          items={items}
          currentFolderId={currentFolderId}
          user={user}
          onItemsChange={setItems}
        />
      )}

      <div className="text-xs text-textSecondary">
        <Link
          href="/projects"
          className="font-medium text-primary hover:text-primaryDark"
        >
          Back to projects
        </Link>
      </div>
    </div>
  );
}
