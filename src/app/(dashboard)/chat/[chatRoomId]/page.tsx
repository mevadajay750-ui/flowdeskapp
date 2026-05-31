"use client";

import { useParams } from "next/navigation";

import { ChatRoom } from "@/components/chat/ChatRoom";

export default function ChatRoomRoutePage() {
  const params = useParams<{ chatRoomId: string }>();
  const chatRoomId = params?.chatRoomId;

  if (!chatRoomId) {
    return (
      <div className="text-sm text-textSecondary">
        No conversation identifier provided.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Conversation</h1>
        <p className="mt-1 text-sm text-textSecondary">
          Chat with your team in real time.
        </p>
      </div>

      <ChatRoom chatRoomId={chatRoomId} />
    </div>
  );
}
