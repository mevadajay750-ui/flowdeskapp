"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { ArrowLeft } from "lucide-react";

import { db } from "@/app/firebase";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { Card } from "@/components/ui/Card";
import {
  directPeerDisplay,
  fetchUserProfile,
  groupInitials,
  isChatRoomParticipant,
} from "@/lib/chat";
import type { ChatRoom as ChatRoomType } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

export default function DmChatPage() {
  const params = useParams<{ chatRoomId: string }>();
  const chatRoomId = params?.chatRoomId;
  const { user, loading: authLoading } = useAuthStore();

  const [chatRoom, setChatRoom] = useState<ChatRoomType | null>(null);
  const [peerDesignation, setPeerDesignation] = useState<string | undefined>();
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [invalidRoom, setInvalidRoom] = useState(false);

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

        if (room.type !== "direct") {
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

        const peer = directPeerDisplay(room, user.uid);
        if (peer.uid) {
          void fetchUserProfile(peer.uid).then((profile) => {
            if (profile?.designation) {
              setPeerDesignation(profile.designation);
            }
          });
        }
      },
      (err) => {
        console.error(err);
        setLoadingRoom(false);
      }
    );

    return () => unsubscribe();
  }, [chatRoomId, user]);

  const peer = chatRoom && user ? directPeerDisplay(chatRoom, user.uid) : null;
  const designation =
    peerDesignation ?? peer?.designation ?? undefined;

  if (authLoading) {
    return (
      <div className="text-sm text-textSecondary">Loading conversation...</div>
    );
  }

  if (!user) {
    return null;
  }

  if (!chatRoomId) {
    return (
      <div className="text-sm text-textSecondary">
        No conversation identifier provided.
      </div>
    );
  }

  if (loadingRoom) {
    return (
      <div className="text-sm text-textSecondary">Loading conversation...</div>
    );
  }

  if (invalidRoom) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          Conversation not found.
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
          href="/chat/dms"
          className="mt-1 rounded-full p-1.5 text-textSecondary transition hover:bg-surface-secondary"
          aria-label="Back to direct messages"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {peer?.photoURL ? (
            <img
              src={peer.photoURL}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {groupInitials(peer?.name)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-textPrimary md:text-2xl">
              {peer?.name ?? "Conversation"}
            </h1>
            <div className="mt-0.5 flex items-center gap-2">
              {designation && (
                <p className="line-clamp-1 text-sm text-textSecondary">
                  {designation}
                </p>
              )}
              <span
                className="inline-flex items-center gap-1 text-xs text-textSecondary"
                aria-hidden
              >
                <span className="h-2 w-2 rounded-full bg-surface-secondary" />
                Offline
              </span>
            </div>
          </div>
        </div>
      </div>

      <ChatRoom
        chatRoomId={chatRoomId}
        type="direct"
        chatRoom={chatRoom ?? undefined}
        peerDesignation={designation}
        hideHeader
      />
    </div>
  );
}
