"use client";

import { useEffect, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/Button";
import { labelClasses } from "@/lib/formStyles";
import {
  ALLOWED_FILE_EXTENSIONS,
  uploadProjectFile,
  validateProjectFile,
} from "@/lib/projectFiles";
import type { AppUser, ProjectFileItem } from "@/types";

interface UploadFileModalProps {
  open: boolean;
  projectId: string;
  parentId: string | null;
  parentName: string;
  existingItems: ProjectFileItem[];
  user: AppUser;
  onClose: () => void;
  onUploaded: (item: ProjectFileItem) => void;
}

export function UploadFileModal({
  open,
  projectId,
  parentId,
  parentName,
  existingItems,
  user,
  onClose,
  onUploaded,
}: UploadFileModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setFileError(null);
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";

    if (!selected) {
      setFile(null);
      setFileError(null);
      return;
    }

    const validationError = validateProjectFile(selected);
    if (validationError) {
      setFile(null);
      setFileError(validationError);
      return;
    }

    setFileError(null);
    setFile(selected);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const item = await uploadProjectFile(projectId, {
        file,
        parentId,
        user,
        existingItems,
      });
      onUploaded(item);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to upload file.");
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
              Upload File
            </h2>
            <p className="mt-1 text-xs text-textSecondary">
              Uploading to {parentName}
            </p>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div>
              <label htmlFor="project-file" className={labelClasses}>
                Choose file
              </label>
              <input
                id="project-file"
                type="file"
                onChange={handleFileChange}
                accept={ALLOWED_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                className="w-full text-sm"
              />
              <p className="mt-1 text-xs text-textSecondary">
                Allowed: PDF, DOC, DOCX, TXT, ZIP, PNG, JPG. Max 25MB.
              </p>
              {file && (
                <p className="mt-2 text-xs text-textPrimary">
                  Selected: {file.name}
                </p>
              )}
              {fileError && (
                <p className="mt-1 text-xs text-red-600">{fileError}</p>
              )}
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
            <Button type="submit" size="sm" disabled={submitting || !file}>
              {submitting ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
