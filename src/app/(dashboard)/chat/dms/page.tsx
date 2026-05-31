"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { MessageSquarePlus, Search } from "lucide-react";

import { db } from "@/app/firebase";
import { DmListRow, type DmListItem } from "@/components/chat/DmListRow";
import { StartDmModal } from "@/components/chat/StartDmModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { directPeerDisplay } from "@/lib/chat";
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

function sortByLastActivity(items: DmListItem[]): DmListItem[] {
  return [...items].sort(
    (a, b) =>
      toTimestamp(b.lastMessageCreatedAt) - toTimestamp(a.lastMessageCreatedAt)
  );
}

export default function DmsPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  const [dms, setDms] = useState<DmListItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const roomsQuery = query(
      collection(db, "chatRooms"),
      where("participantIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const entries: DmListItem[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatRoom, "id">;
          if (data.type !== "direct") return;

          const peer = directPeerDisplay(
            { participants: data.participants ?? [] },
            user.uid
          );
          const last = data.lastMessage;

          entries.push({
            chatRoomId: docSnap.id,
            peerName: peer.name,
            peerPhotoUrl: peer.photoURL,
            lastMessagePreview: last?.text ?? null,
            lastMessageCreatedAt: last?.createdAt ?? null,
          });
        });

        setDms(sortByLastActivity(entries));
        setFetching(false);
      },
      (err) => {
        console.error(err);
        setError("Failed to load direct messages.");
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const filteredDms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dms;
    return dms.filter((dm) => dm.peerName.toLowerCase().includes(term));
  }, [dms, search]);

  const handleStarted = (chatRoomId: string) => {
    setStartOpen(false);
    router.push(`/chat/dms/${chatRoomId}`);
  };

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">
        Loading your messages...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">
            Direct Messages
          </h1>
          <p className="mt-1 text-sm text-textSecondary">
            Private conversations with your teammates.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setStartOpen(true)}
          className="shrink-0"
        >
          <MessageSquarePlus className="mr-1.5 h-4 w-4" />
          New Message
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {fetching ? (
        <Card className="text-sm text-textSecondary">Loading messages...</Card>
      ) : filteredDms.length === 0 ? (
        <EmptyState
          title={
            search.trim()
              ? "No conversations match your search."
              : "No conversations yet."
          }
          description={
            search.trim()
              ? "Try a different search term."
              : "Start a direct message with a teammate."
          }
          actionLabel={!search.trim() ? "New Message" : undefined}
          onActionClick={!search.trim() ? () => setStartOpen(true) : undefined}
        />
      ) : (
        <Card className="rounded-2xl bg-slate-50/80 p-0 shadow-sm">
          <div className="divide-y divide-slate-100">
            {filteredDms.map((item) => (
              <DmListRow key={item.chatRoomId} item={item} />
            ))}
          </div>
        </Card>
      )}

      <StartDmModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onStarted={handleStarted}
      />
    </div>
  );
}
