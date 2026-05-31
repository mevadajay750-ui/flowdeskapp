"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  fetchApprovedUsers,
  getOrCreateDirectChatRoom,
  groupInitials,
} from "@/lib/chat";
import type { AppUser } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface StartDmModalProps {
  open: boolean;
  onClose: () => void;
  onStarted: (chatRoomId: string) => void;
}

export function StartDmModal({ open, onClose, onStarted }: StartDmModalProps) {
  const { user } = useAuthStore();

  const [search, setSearch] = useState("");
  const [approvedUsers, setApprovedUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [startingUid, setStartingUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return approvedUsers;
    return approvedUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.designation?.toLowerCase().includes(term)
    );
  }, [approvedUsers, search]);

  const resetForm = () => {
    setSearch("");
    setError(null);
    setStartingUid(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectUser = async (otherUser: AppUser) => {
    if (!user || startingUid) return;

    setStartingUid(otherUser.uid);
    setError(null);

    try {
      const chatRoomId = await getOrCreateDirectChatRoom({
        creator: {
          uid: user.uid,
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
        },
        otherUid: otherUser.uid,
      });
      resetForm();
      onStarted(chatRoomId);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to start conversation."
      );
      setStartingUid(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-lg">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-textPrimary">
            New Message
          </h2>
          <p className="mt-1 text-xs text-textSecondary">
            Search for a teammate to start a direct message.
          </p>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or designation..."
              className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
            {loadingUsers ? (
              <p className="px-3 py-2 text-xs text-textSecondary">
                Loading users...
              </p>
            ) : filteredUsers.length === 0 ? (
              <p className="px-3 py-2 text-xs text-textSecondary">
                {search.trim()
                  ? "No users match your search."
                  : "No other approved users available."}
              </p>
            ) : (
              filteredUsers.map((u) => {
                const isStarting = startingUid === u.uid;
                return (
                  <button
                    key={u.uid}
                    type="button"
                    disabled={!!startingUid}
                    onClick={() => void handleSelectUser(u)}
                    className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {groupInitials(u.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-textPrimary">
                        {u.name}
                      </div>
                      {u.designation && (
                        <div className="truncate text-xs text-textSecondary">
                          {u.designation}
                        </div>
                      )}
                    </div>
                    {isStarting && (
                      <span className="text-xs text-textSecondary">
                        Starting...
                      </span>
                    )}
                  </button>
                );
              })
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
            disabled={!!startingUid}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
