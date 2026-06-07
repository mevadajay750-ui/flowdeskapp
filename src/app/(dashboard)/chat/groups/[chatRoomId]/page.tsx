"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, Info } from "lucide-react";

import { db } from "@/app/firebase";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { GroupSettingsPanel } from "@/components/chat/GroupSettingsPanel";
import { Card } from "@/components/ui/Card";
import { groupInitials, isChatRoomParticipant } from "@/lib/chat";
import type { ChatRoom as ChatRoomType } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

export default function GroupChatPage() {
  const params = useParams<{ chatRoomId: string }>();
  const chatRoomId = params?.chatRoomId;
  const { user, loading: authLoading } = useAuthStore();

  const [chatRoom, setChatRoom] = useState<ChatRoomType | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [invalidRoom, setInvalidRoom] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const reloadRoom = useCallback(async () => {
    if (!chatRoomId) return;
    const snap = await getDoc(doc(db, "chatRooms", chatRoomId));
    if (snap.exists()) {
      setChatRoom({ id: snap.id, ...snap.data() } as ChatRoomType);
    }
  }, [chatRoomId]);

  useEffect(() => {
    if (!chatRoomId || !user) return;

    const roomRef = doc(db, "chatRooms", chatRoomId);
    const unsubscribe = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setInvalidRoom(true);
          setChatRoom(null);
          setLoadingRoom(false);
          return;
        }

        const room = { id: snap.id, ...snap.data() } as ChatRoomType;

        if (room.type !== "group") {
          setInvalidRoom(true);
          setChatRoom(null);
          setLoadingRoom(false);
          return;
        }

        if (!isChatRoomParticipant(room, user.uid)) {
          setAccessDenied(true);
          setChatRoom(null);
          setLoadingRoom(false);
          return;
        }

        setChatRoom(room);
        setLoadingRoom(false);
      },
      (err) => {
        console.error(err);
        setLoadingRoom(false);
      }
    );

    return () => unsubscribe();
  }, [chatRoomId, user]);

  if (authLoading) {
    return (
      <div className="text-sm text-textSecondary">Loading group chat...</div>
    );
  }

  if (!user) {
    return null;
  }

  if (!chatRoomId) {
    return (
      <div className="text-sm text-textSecondary">
        No group identifier provided.
      </div>
    );
  }

  if (loadingRoom) {
    return (
      <div className="text-sm text-textSecondary">Loading group chat...</div>
    );
  }

  if (invalidRoom) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          Group not found.
        </p>
      </Card>
    );
  }

  if (accessDenied) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">Access Denied</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href="/chat/groups"
          className="mt-1 rounded-full p-1.5 text-textSecondary transition hover:bg-surface-secondary"
          aria-label="Back to groups"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {chatRoom?.avatarUrl ? (
            <img
              src={chatRoom.avatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {groupInitials(chatRoom?.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-textPrimary md:text-2xl">
              {chatRoom?.name ?? "Group"}
            </h1>
            {chatRoom?.description && (
              <p className="mt-0.5 line-clamp-1 text-sm text-textSecondary">
                {chatRoom.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 rounded-full border border-border p-2 text-textSecondary transition hover:bg-surface-secondary hover:text-textPrimary"
            aria-label="Group settings"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ChatRoom
        chatRoomId={chatRoomId}
        type="group"
        chatRoom={chatRoom ?? undefined}
        hideHeader
      />

      {chatRoom && (
        <GroupSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          chatRoom={chatRoom}
          onUpdated={() => void reloadRoom()}
        />
      )}
    </div>
  );
}
