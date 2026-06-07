"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { inputClasses, labelClasses } from "@/lib/formStyles";
import { createFolder } from "@/lib/projectFiles";
import type { AppUser, ProjectFileItem } from "@/types";

interface CreateFolderModalProps {
  open: boolean;
  projectId: string;
  parentId: string | null;
  parentName: string;
  existingItems: ProjectFileItem[];
  user: AppUser;
  onClose: () => void;
  onCreated: (item: ProjectFileItem) => void;
}

export function CreateFolderModal({
  open,
  projectId,
  parentId,
  parentName,
  existingItems,
  user,
  onClose,
  onCreated,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const item = await createFolder(projectId, {
        name,
        parentId,
        user,
        existingItems,
      });
      onCreated(item);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create folder.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-textPrimary">
              New Folder
            </h2>
            <p className="mt-1 text-xs text-textSecondary">
              Creating in {parentName}
            </p>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div>
              <label htmlFor="folder-name" className={labelClasses}>
                Folder name
              </label>
              <input
                id="folder-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Requirements"
                className={inputClasses}
                autoFocus
              />
            </div>

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
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !name.trim()}>
              {submitting ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
