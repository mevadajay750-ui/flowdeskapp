"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateFolderModal } from "@/components/projects/files/CreateFolderModal";
import { FileBreadcrumbs } from "@/components/projects/files/FileBreadcrumbs";
import { FileItemRow } from "@/components/projects/files/FileItemRow";
import { FolderTree } from "@/components/projects/files/FolderTree";
import { UploadFileModal } from "@/components/projects/files/UploadFileModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  buildFileTree,
  createPage,
  deleteItem,
  getBreadcrumbPath,
  getChildren,
} from "@/lib/projectFiles";
import type { AppUser, Project, ProjectFileItem } from "@/types";

interface FileExplorerProps {
  project: Project;
  items: ProjectFileItem[];
  currentFolderId: string | null;
  user: AppUser;
  onItemsChange: (items: ProjectFileItem[]) => void;
}

type ModalType = "folder" | "upload" | null;

export function FileExplorer({
  project,
  items,
  currentFolderId,
  user,
  onItemsChange,
}: FileExplorerProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalType>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creatingPage, setCreatingPage] = useState(false);

  const readOnly = project.status === "archived";
  const projectId = project.id;

  const breadcrumbPath = useMemo(
    () => getBreadcrumbPath(items, currentFolderId),
    [items, currentFolderId]
  );

  const currentFolder = currentFolderId
    ? items.find((item) => item.id === currentFolderId)
    : null;

  const parentName = currentFolder?.name ?? "Root";
  const parentId = currentFolderId;

  const folderTree = useMemo(() => buildFileTree(items), [items]);
  const currentItems = useMemo(
    () => getChildren(items, currentFolderId),
    [items, currentFolderId]
  );

  const handleItemCreated = (item: ProjectFileItem) => {
    onItemsChange([...items, item]);
  };

  const handleDelete = async (item: ProjectFileItem) => {
    if (readOnly) return;

    const confirmed = window.confirm(
      `Delete "${item.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setActionError(null);

    try {
      await deleteItem(projectId, item, items);
      onItemsChange(items.filter((entry) => entry.id !== item.id));
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error ? err.message : "Failed to delete item."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreatePage = async () => {
    if (readOnly) return;

    const name = window.prompt("Page title");
    if (!name?.trim()) return;

    setCreatingPage(true);
    setActionError(null);

    try {
      const item = await createPage(projectId, {
        name: name.trim(),
        parentId,
        user,
        existingItems: items,
      });
      onItemsChange([...items, item]);
      router.push(`/projects/${projectId}/files/${item.id}`);
    } catch (err) {
      console.error(err);
      setActionError(
        err instanceof Error ? err.message : "Failed to create page."
      );
    } finally {
      setCreatingPage(false);
      setMenuOpen(false);
    }
  };

  return (
    <>
      {readOnly && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This project is archived — files are read-only.
        </div>
      )}

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <Card className="w-full shrink-0 rounded-2xl p-3 shadow-sm lg:w-60">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">
            Folders
          </div>
          <FolderTree
            projectId={projectId}
            tree={folderTree}
            currentFolderId={currentFolderId}
          />
        </Card>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FileBreadcrumbs projectId={projectId} path={breadcrumbPath} />

            {!readOnly && (
              <div className="relative">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  + New
                </Button>
                {menuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Close menu"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-border bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-textPrimary hover:bg-surface-secondary"
                        onClick={() => {
                          setMenuOpen(false);
                          setModal("folder");
                        }}
                      >
                        New folder
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-textPrimary hover:bg-surface-secondary"
                        onClick={() => void handleCreatePage()}
                        disabled={creatingPage}
                      >
                        {creatingPage ? "Creating page..." : "New page"}
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-textPrimary hover:bg-surface-secondary"
                        onClick={() => {
                          setMenuOpen(false);
                          setModal("upload");
                        }}
                      >
                        Upload file
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <Card className="rounded-2xl shadow-sm">
            {currentItems.length === 0 ? (
              <EmptyState
                title="This folder is empty"
                description={
                  readOnly
                    ? "No files or pages have been added here yet."
                    : "Create a folder, page, or upload a file to get started."
                }
                actionLabel={readOnly ? undefined : "New folder"}
                onActionClick={
                  readOnly ? undefined : () => setModal("folder")
                }
                className="border-none bg-transparent shadow-none"
              />
            ) : (
              <div>
                {currentItems.map((item) => (
                  <FileItemRow
                    key={item.id}
                    projectId={projectId}
                    item={item}
                    readOnly={readOnly}
                    onDelete={(entry) => void handleDelete(entry)}
                    deleting={deletingId === item.id}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <CreateFolderModal
        open={modal === "folder"}
        projectId={projectId}
        parentId={parentId}
        parentName={parentName}
        existingItems={items}
        user={user}
        onClose={() => setModal(null)}
        onCreated={handleItemCreated}
      />

      <UploadFileModal
        open={modal === "upload"}
        projectId={projectId}
        parentId={parentId}
        parentName={parentName}
        existingItems={items}
        user={user}
        onClose={() => setModal(null)}
        onUploaded={handleItemCreated}
      />
    </>
  );
}
