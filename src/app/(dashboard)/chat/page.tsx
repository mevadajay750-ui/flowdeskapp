"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { format } from "date-fns";
import { ChevronRight, MessageSquare, Users } from "lucide-react";

import { db } from "@/app/firebase";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChatRoom, ChatRoomType } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface ChatListEntry {
  chatRoomId: string;
  name: string;
  type: ChatRoomType;
  lastMessagePreview: string | null;
  lastMessageCreatedAt: any | null;
}

function formatTime(value: any): string {
  if (!value) return "";

  try {
    if (typeof value.toDate === "function") {
      return format(value.toDate(), "HH:mm");
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return format(date, "HH:mm");
    }
  } catch {
    // ignore
  }

  return "";
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

function sortByLastActivity(items: ChatListEntry[]): ChatListEntry[] {
  return [...items].sort(
    (a, b) =>
      toTimestamp(b.lastMessageCreatedAt) - toTimestamp(a.lastMessageCreatedAt)
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
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {item.type === "direct" ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                  </div>
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
                </div>
                <div className="flex items-center gap-2 pl-2 text-xs text-textSecondary">
                  {hasMessages && (
                    <span className="whitespace-nowrap">
                      {formatTime(item.lastMessageCreatedAt)}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
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

  const [rooms, setRooms] = useState<ChatListEntry[]>([]);
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
        const entries: ChatListEntry[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatRoom, "id">;
          const last = data.lastMessage;

          entries.push({
            chatRoomId: docSnap.id,
            name: data.name ?? "Conversation",
            type: data.type,
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
    const direct = sortByLastActivity(
      rooms.filter((room) => room.type === "direct")
    );
    const group = sortByLastActivity(
      rooms.filter((room) => room.type === "group")
    );
    const project = sortByLastActivity(
      rooms.filter((room) => room.type === "project")
    );

    return { direct, group, project };
  }, [rooms]);

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
        <EmptyState
          title="No conversations yet."
          description="Project chats appear here when you are added to a project. Group chats and direct messages will show up as they are created."
        />
      ) : (
        <div className="space-y-6">
          <ChatSection title="Direct Messages" items={grouped.direct} />
          <ChatSection title="Groups" items={grouped.group} />
          <ChatSection title="Projects" items={grouped.project} />
        </div>
      )}
    </div>
  );
}
