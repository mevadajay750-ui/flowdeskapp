"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  addGroupMembers,
  fetchApprovedUsers,
  groupInitials,
  isGroupAdmin,
  removeGroupMember,
  updateGroupChatRoom,
  uploadGroupAvatar,
  validateGroupAvatarFile,
} from "@/lib/chat";
import type { AppUser, ChatRoom } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface GroupSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  chatRoom: ChatRoom;
  onUpdated: () => void;
}

export function GroupSettingsPanel({
  open,
  onClose,
  chatRoom,
  onUpdated,
}: GroupSettingsPanelProps) {
  const { user } = useAuthStore();

  const [editName, setEditName] = useState(chatRoom.name ?? "");
  const [editDescription, setEditDescription] = useState(
    chatRoom.description ?? ""
  );
  const [approvedUsers, setApprovedUsers] = useState<AppUser[]>([]);
  const [selectedNewUids, setSelectedNewUids] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const isAdmin = user ? isGroupAdmin(chatRoom, user.uid) : false;
  const admins = chatRoom.admins ?? [];

  useEffect(() => {
    if (!open) return;
    setEditName(chatRoom.name ?? "");
    setEditDescription(chatRoom.description ?? "");
    setSelectedNewUids([]);
    setShowAddMembers(false);
    setError(null);
    setFileError(null);
  }, [open, chatRoom]);

  useEffect(() => {
    if (!open || !isAdmin || !showAddMembers) return;

    setLoadingUsers(true);
    void fetchApprovedUsers()
      .then(setApprovedUsers)
      .catch((err) => {
        console.error(err);
        setError("Failed to load users.");
      })
      .finally(() => setLoadingUsers(false));
  }, [open, isAdmin, showAddMembers]);

  const availableToAdd = useMemo(() => {
    const existing = new Set(chatRoom.participantIds ?? []);
    return approvedUsers.filter((u) => !existing.has(u.uid));
  }, [approvedUsers, chatRoom.participantIds]);

  const toggleNewMember = (uid: string) => {
    setSelectedNewUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateGroupChatRoom(chatRoom.id, {
        name: editName,
        description: editDescription,
      });
      onUpdated();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to update group."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateGroupAvatarFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setFileError(null);

    try {
      const avatarUrl = await uploadGroupAvatar(chatRoom.id, file);
      await updateGroupChatRoom(chatRoom.id, { avatarUrl });
      onUpdated();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload avatar."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedNewUids.length === 0) return;

    setAddingMembers(true);
    setError(null);
    try {
      await addGroupMembers(chatRoom.id, selectedNewUids);
      setSelectedNewUids([]);
      setShowAddMembers(false);
      onUpdated();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to add members."
      );
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (admins.includes(uid) && admins.length === 1) {
      setError("Cannot remove the last group admin.");
      return;
    }

    if (!window.confirm("Remove this member from the group?")) return;

    setRemovingUid(uid);
    setError(null);
    try {
      await removeGroupMember(chatRoom.id, uid);
      onUpdated();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to remove member."
      );
    } finally {
      setRemovingUid(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-textPrimary">
            Group Info
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-textSecondary hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col items-center gap-3 pb-4">
            {chatRoom.avatarUrl ? (
              <img
                src={chatRoom.avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                {groupInitials(chatRoom.name)}
              </div>
            )}
            {isAdmin && (
              <div className="w-full">
                <label className="block text-xs font-medium text-textSecondary">
                  Change avatar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleAvatarChange(e)}
                  disabled={saving}
                  className="mt-1 w-full text-sm"
                />
                {fileError && (
                  <p className="mt-1 text-xs text-red-600">{fileError}</p>
                )}
              </div>
            )}
          </div>

          {isAdmin ? (
            <div className="space-y-3 border-b border-border pb-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-textSecondary">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-textSecondary">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSaveInfo()}
                disabled={saving || !editName.trim()}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          ) : (
            <div className="space-y-1 border-b border-border pb-4">
              <h3 className="text-base font-semibold text-textPrimary">
                {chatRoom.name}
              </h3>
              {chatRoom.description && (
                <p className="text-sm text-textSecondary">
                  {chatRoom.description}
                </p>
              )}
            </div>
          )}

          <div className="pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                Members ({chatRoom.participants.length})
              </h3>
              {isAdmin && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddMembers((v) => !v)}
                >
                  {showAddMembers ? "Cancel" : "Add members"}
                </Button>
              )}
            </div>

            {showAddMembers && isAdmin && (
              <div className="mb-4 space-y-2 rounded-xl border border-border p-3">
                <div className="max-h-32 overflow-y-auto">
                  {loadingUsers ? (
                    <p className="text-xs text-textSecondary">Loading...</p>
                  ) : availableToAdd.length === 0 ? (
                    <p className="text-xs text-textSecondary">
                      All approved users are already members.
                    </p>
                  ) : (
                    availableToAdd.map((u) => (
                      <label
                        key={u.uid}
                        className="flex cursor-pointer items-center gap-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNewUids.includes(u.uid)}
                          onChange={() => toggleNewMember(u.uid)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-textPrimary">
                          {u.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleAddMembers()}
                  disabled={addingMembers || selectedNewUids.length === 0}
                >
                  {addingMembers ? "Adding..." : "Add selected"}
                </Button>
              </div>
            )}

            <ul className="space-y-2">
              {chatRoom.participants.map((member) => {
                const isMemberAdmin = admins.includes(member.uid);
                const isSelf = member.uid === user?.uid;
                const canRemove =
                  isAdmin &&
                  !isSelf &&
                  !(isMemberAdmin && admins.length === 1);

                return (
                  <li
                    key={member.uid}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-textSecondary">
                          {groupInitials(member.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-textPrimary">
                          {member.name}
                          {isSelf && (
                            <span className="text-textSecondary"> (you)</span>
                          )}
                        </div>
                        {isMemberAdmin && (
                          <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    {canRemove && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRemoveMember(member.uid)}
                        disabled={removingUid === member.uid}
                        className="text-red-600 hover:text-red-700"
                      >
                        {removingUid === member.uid ? "..." : "Remove"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
