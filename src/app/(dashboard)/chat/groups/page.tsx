"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Plus, Search } from "lucide-react";

import { db } from "@/app/firebase";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import {
  GroupListRow,
  type GroupListItem,
} from "@/components/chat/GroupListRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChatRoom } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

function toTimestamp(value: unknown): number {
  if (!value) return 0;
  try {
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate: () => Date }).toDate === "function"
    ) {
      return (value as { toDate: () => Date }).toDate().getTime();
    }
    const date = new Date(value as string | number | Date);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  } catch {
    // ignore
  }
  return 0;
}

function sortByLastActivity(items: GroupListItem[]): GroupListItem[] {
  return [...items].sort(
    (a, b) =>
      toTimestamp(b.lastMessageCreatedAt) - toTimestamp(a.lastMessageCreatedAt)
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const roomsQuery = query(
      collection(db, "chatRooms"),
      where("participantIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const entries: GroupListItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatRoom, "id">;
          if (data.type !== "group") return;

          const last = data.lastMessage;
          entries.push({
            chatRoomId: docSnap.id,
            name: data.name ?? "Group",
            description: data.description,
            avatarUrl: data.avatarUrl,
            memberCount: data.participants?.length ?? 0,
            lastMessagePreview: last?.text ?? null,
            lastMessageCreatedAt: last?.createdAt ?? null,
          });
        });

        setGroups(sortByLastActivity(entries));
        setFetching(false);
      },
      (err) => {
        console.error(err);
        setError("Failed to load groups.");
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(term));
  }, [groups, search]);

  const handleCreated = (chatRoomId: string) => {
    setCreateOpen(false);
    router.push(`/chat/groups/${chatRoomId}`);
  };

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading your groups...</div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Groups</h1>
          <p className="mt-1 text-sm text-textSecondary">
            Organization groups you belong to.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="shrink-0"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups by name..."
          className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {fetching ? (
        <Card className="text-sm text-textSecondary">Loading groups...</Card>
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          title={search.trim() ? "No groups match your search." : "No groups yet."}
          description={
            search.trim()
              ? "Try a different search term."
              : "Create a group to start collaborating with your team."
          }
        />
      ) : (
        <Card className="rounded-2xl bg-slate-50/80 p-0 shadow-sm">
          <div className="divide-y divide-slate-100">
            {filteredGroups.map((item) => (
              <GroupListRow key={item.chatRoomId} item={item} />
            ))}
          </div>
        </Card>
      )}

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
