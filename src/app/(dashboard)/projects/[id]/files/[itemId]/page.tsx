"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/app/firebase";
import { PageEditor } from "@/components/projects/files/PageEditor";
import { ProjectTabs } from "@/components/projects/ProjectTabs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  deleteItem,
  formatFileSize,
  formatItemDate,
  getProjectFileDownloadUrl,
  getProjectFileItem,
  listProjectFileItems,
  replaceProjectFile,
  validateProjectFile,
} from "@/lib/projectFiles";
import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";
import type { Project, ProjectFileItem } from "@/types";

export default function ProjectFileItemPage() {
  const params = useParams<{ id: string; itemId: string }>();
  const router = useRouter();
  const projectId = params?.id;
  const itemId = params?.itemId;

  const { user, loading } = useAuthStore();
  const [project, setProject] = useState<Project | null>(null);
  const [item, setItem] = useState<ProjectFileItem | null>(null);
  const [allItems, setAllItems] = useState<ProjectFileItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!projectId || !itemId) return;

      setFetching(true);
      setError(null);

      try {
        const [projectSnap, fileItem, items] = await Promise.all([
          getDoc(doc(db, "projects", projectId)),
          getProjectFileItem(projectId, itemId),
          listProjectFileItems(projectId),
        ]);

        if (!projectSnap.exists()) {
          setProject(null);
          setItem(null);
          setAllItems([]);
          setError("Project not found.");
          return;
        }

        setProject({
          id: projectSnap.id,
          ...(projectSnap.data() as Omit<Project, "id">),
        });
        setAllItems(items);

        if (!fileItem || (fileItem.type !== "page" && fileItem.type !== "file")) {
          setItem(null);
          setError("File or page not found.");
          return;
        }

        setItem(fileItem);
      } catch (err) {
        console.error(err);
        setError("Unable to load file details.");
      } finally {
        setFetching(false);
      }
    };

    void load();
  }, [projectId, itemId]);

  const readOnly = project?.status === "archived";
  const backHref = item?.parentId
    ? `/projects/${projectId}/files?folder=${item.parentId}`
    : `/projects/${projectId}/files`;

  const canAccess =
    !!user &&
    !!project &&
    (hasPermission(user.role, "view_all_projects") ||
      project.memberIds?.includes(user.uid));

  const handleDownload = async () => {
    if (!item?.storagePath) {
      setActionError("File storage path is missing.");
      return;
    }

    setDownloading(true);
    setActionError(null);

    try {
      const url = await getProjectFileDownloadUrl(item.storagePath);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.fileName ?? item.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error
          ? err.message.includes("unauthorized")
            ? "You do not have permission to download this file. Confirm you are a project member."
            : err.message
          : "Unable to download file."
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleReplaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !projectId || !item || item.type !== "file") return;

    const validationError = validateProjectFile(file);
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setReplacing(true);
    setActionError(null);

    try {
      const updated = await replaceProjectFile(projectId, item, file);
      setItem(updated);
      setAllItems((prev) =>
        prev.map((entry) => (entry.id === updated.id ? updated : entry))
      );
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error ? err.message : "Failed to replace file."
      );
    } finally {
      setReplacing(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId || !item || readOnly) return;

    const confirmed = window.confirm(
      `Delete "${item.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setActionError(null);

    try {
      await deleteItem(projectId, item, allItems);
      router.push(backHref);
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error ? err.message : "Failed to delete item."
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading file details...</div>
    );
  }

  if (!projectId || !itemId) {
    return (
      <div className="text-sm text-textSecondary">
        No project or file identifier provided.
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">
          {item?.name ?? "Project File"}
        </h1>
        <p className="mt-1 text-sm text-textSecondary">
          {item?.type === "page"
            ? "Edit project documentation page."
            : "View and download project file."}
        </p>
      </div>

      <ProjectTabs projectId={projectId} />

      {readOnly && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This project is archived — files are read-only.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </div>
      )}

      {fetching ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">Loading...</p>
        </Card>
      ) : !canAccess ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">
            You do not have access to this project&apos;s files.
          </p>
        </Card>
      ) : !item ? (
        <Card className="rounded-2xl shadow-sm">
          <p className="text-sm text-textSecondary">
            This file or page could not be found.
          </p>
        </Card>
      ) : (
        <Card className="rounded-2xl p-4 shadow-sm sm:p-6">
          {item.type === "page" ? (
            <PageEditor
              projectId={projectId}
              item={item}
              readOnly={readOnly}
              onSaved={(updates) => {
                setItem((prev) =>
                  prev ? { ...prev, ...updates, updatedAt: new Date() } : prev
                );
              }}
            />
          ) : (
            <div className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    File name
                  </dt>
                  <dd className="mt-1 text-textPrimary">{item.fileName ?? item.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    Size
                  </dt>
                  <dd className="mt-1 text-textPrimary">
                    {formatFileSize(item.fileSize)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    Type
                  </dt>
                  <dd className="mt-1 text-textPrimary">
                    {item.mimeType ?? "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    Uploaded by
                  </dt>
                  <dd className="mt-1 text-textPrimary">{item.createdByName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    Last updated
                  </dt>
                  <dd className="mt-1 text-textPrimary">
                    {formatItemDate(item.updatedAt ?? item.createdAt)}
                  </dd>
                </div>
              </dl>

              {(item.storagePath || item.downloadUrl) && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleDownload()}
                  disabled={downloading}
                >
                  {downloading ? "Preparing download..." : "Download file"}
                </Button>
              )}

              {!readOnly && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <label className="inline-flex cursor-pointer items-center">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => void handleReplaceFile(event)}
                      disabled={replacing}
                    />
                    <span className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-textPrimary hover:bg-surface-secondary">
                      {replacing ? "Replacing..." : "Replace file"}
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <Link
              href={backHref}
              className="text-sm font-medium text-primary hover:text-primaryDark"
            >
              Back to files
            </Link>

            {!readOnly && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
