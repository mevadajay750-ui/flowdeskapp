"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/app/firebase";
import {
  DmListRow,
  type DmListItem,
} from "@/components/chat/DmListRow";
import {
  GroupListRow,
  type GroupListItem,
} from "@/components/chat/GroupListRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { directPeerDisplay } from "@/lib/chat";
import type { ChatRoom, ChatRoomType } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface ChatListEntry {
  chatRoomId: string;
  name: string;
  type: ChatRoomType;
  lastMessagePreview: string | null;
  lastMessageCreatedAt: any | null;
}

function toTimestamp(value: any): number {
  if (!value) return 0;
  try {
    if (typeof value.toDate === "function") {
      return value.toDate().getTime();
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  } catch {
    // ignore
  }
  return 0;
}

function sortByLastActivity<T extends { lastMessageCreatedAt: any | null }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) =>
      toTimestamp(b.lastMessageCreatedAt) - toTimestamp(a.lastMessageCreatedAt)
  );
}

function DmsSection({ items }: { items: DmListItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
          Direct Messages
        </h2>
        <Link
          href="/chat/dms"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all messages
        </Link>
      </div>
      <Card className="rounded-2xl bg-slate-50/80 p-0 shadow-sm">
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <DmListRow key={item.chatRoomId} item={item} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function GroupsSection({ items }: { items: GroupListItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
          Groups
        </h2>
        <Link
          href="/chat/groups"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all groups
        </Link>
      </div>
      <Card className="rounded-2xl bg-slate-50/80 p-0 shadow-sm">
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <GroupListRow key={item.chatRoomId} item={item} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ChatSection({
  title,
  items,
}: {
  title: string;
  items: ChatListEntry[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
        {title}
      </h2>
      <Card className="rounded-2xl bg-slate-50/80 p-0 shadow-sm">
        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const hasMessages = !!item.lastMessagePreview;
            return (
              <Link
                key={item.chatRoomId}
                href={`/chat/${item.chatRoomId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-100/80"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-textPrimary">
                    {item.name}
                  </div>
                  <div className="mt-0.5 text-xs text-textSecondary">
                    <span className="line-clamp-1">
                      {hasMessages
                        ? item.lastMessagePreview
                        : "No messages yet"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default function ChatListPage() {
  const { user, loading } = useAuthStore();

  const [rooms, setRooms] = useState<
    (ChatListEntry & {
      description?: string;
      avatarUrl?: string;
      memberCount?: number;
      participants?: ChatRoom["participants"];
    })[]
  >([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setFetching(false);
      return;
    }

    setFetching(true);
    setError(null);

    const roomsQuery = query(
      collection(db, "chatRooms"),
      where("participantIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const entries: (ChatListEntry & {
          description?: string;
          avatarUrl?: string;
          memberCount?: number;
          participants?: ChatRoom["participants"];
        })[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatRoom, "id">;
          const last = data.lastMessage;

          entries.push({
            chatRoomId: docSnap.id,
            name: data.name ?? "Conversation",
            type: data.type,
            description: data.description,
            avatarUrl: data.avatarUrl,
            memberCount: data.participants?.length ?? 0,
            participants: data.participants,
            lastMessagePreview: last?.text ?? null,
            lastMessageCreatedAt: last?.createdAt ?? null,
          });
        });

        setRooms(entries);
        setFetching(false);
      },
      (err) => {
        console.error(err);
        setError("Failed to load chats.");
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const grouped = useMemo(() => {
    const directRooms = rooms.filter((room) => room.type === "direct");
    const directItems: DmListItem[] = sortByLastActivity(
      directRooms.map((room) => {
        const peer = directPeerDisplay(
          { participants: room.participants ?? [] },
          user?.uid ?? ""
        );
        return {
          chatRoomId: room.chatRoomId,
          peerName: peer.name,
          peerPhotoUrl: peer.photoURL,
          lastMessagePreview: room.lastMessagePreview,
          lastMessageCreatedAt: room.lastMessageCreatedAt,
        };
      })
    ).slice(0, 5);

    const groupItems: GroupListItem[] = sortByLastActivity(
      rooms
        .filter((room) => room.type === "group")
        .map((room) => ({
          chatRoomId: room.chatRoomId,
          name: room.name,
          description: room.description,
          avatarUrl: room.avatarUrl,
          memberCount: room.memberCount ?? 0,
          lastMessagePreview: room.lastMessagePreview,
          lastMessageCreatedAt: room.lastMessageCreatedAt,
        }))
    );

    const project = sortByLastActivity(
      rooms.filter((room) => room.type === "project")
    );

    return { directItems, groupItems, project };
  }, [rooms, user?.uid]);

  const hasAnyRooms = rooms.length > 0;

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading your chats...</div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Chats</h1>
        <p className="mt-1 text-sm text-textSecondary">
          Direct messages, groups, and project conversations in one place.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {fetching ? (
        <Card className="text-sm text-textSecondary">Loading chats...</Card>
      ) : !hasAnyRooms ? (
        <>
          <EmptyState
            title="No conversations yet."
            description="Start a direct message or create a group to begin collaborating with your team."
          />
          <div className="flex justify-center gap-4 text-center">
            <Link
              href="/chat/dms"
              className="text-sm font-medium text-primary hover:underline"
            >
              Direct Messages
            </Link>
            <Link
              href="/chat/groups"
              className="text-sm font-medium text-primary hover:underline"
            >
              Browse groups
            </Link>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <DmsSection items={grouped.directItems} />
          <GroupsSection items={grouped.groupItems} />
          <ChatSection title="Projects" items={grouped.project} />
        </div>
      )}
    </div>
  );
}
