"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  createGroupChatRoom,
  fetchApprovedUsers,
  validateGroupAvatarFile,
} from "@/lib/chat";
import type { AppUser } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (chatRoomId: string) => void;
}

export function CreateGroupModal({
  open,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const { user } = useAuthStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;

    setLoadingUsers(true);
    void fetchApprovedUsers()
      .then((users) => {
        setApprovedUsers(users.filter((u) => u.uid !== user.uid));
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load users.");
      })
      .finally(() => setLoadingUsers(false));
  }, [open, user]);

  const selectableUsers = useMemo(
    () => approvedUsers.filter((u) => u.uid !== user?.uid),
    [approvedUsers, user?.uid]
  );

  const resetForm = () => {
    setName("");
    setDescription("");
    setAvatarFile(null);
    setSelectedUids([]);
    setError(null);
    setFileError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setFileError(null);
      return;
    }
    const validationError = validateGroupAvatarFile(file);
    if (validationError) {
      setFileError(validationError);
      setAvatarFile(null);
      return;
    }
    setFileError(null);
    setAvatarFile(file);
  };

  const toggleParticipant = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Group name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const chatRoomId = await createGroupChatRoom({
        name: trimmedName,
        description,
        participantUids: selectedUids,
        avatarFile,
        creator: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
        },
      });
      resetForm();
      onCreated(chatRoomId);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to create group."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-lg">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-textPrimary">
            Create Group
          </h2>
          <p className="mt-1 text-xs text-textSecondary">
            Start a group conversation with your team.
          </p>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-textSecondary">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-textSecondary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              rows={2}
              className="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-textSecondary">
              Group Avatar
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full text-sm"
            />
            <p className="text-xs text-textSecondary">
              Image only, up to 3MB.
            </p>
            {fileError && (
              <p className="text-xs text-red-600">{fileError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-textSecondary">
              Select Participants
            </label>
            <p className="text-xs text-textSecondary">
              You will be added automatically as a group admin.
            </p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-border">
              {loadingUsers ? (
                <p className="px-3 py-2 text-xs text-textSecondary">
                  Loading users...
                </p>
              ) : selectableUsers.length === 0 ? (
                <p className="px-3 py-2 text-xs text-textSecondary">
                  No other approved users available.
                </p>
              ) : (
                selectableUsers.map((u) => (
                  <label
                    key={u.uid}
                    className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUids.includes(u.uid)}
                      onChange={() => toggleParticipant(u.uid)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-textPrimary">
                      {u.name}
                    </span>
                    <span className="text-xs text-textSecondary">
                      ({u.email})
                    </span>
                  </label>
                ))
              )}
            </div>
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
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={submitting || !name.trim()}
          >
            {submitting ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </div>
    </div>
  );
}
