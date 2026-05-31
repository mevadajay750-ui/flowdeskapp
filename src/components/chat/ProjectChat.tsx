"use client";

import { useEffect, useState } from "react";

import { ChatRoom } from "@/components/chat/ChatRoom";
import { Card } from "@/components/ui/Card";
import { ensureProjectChatRoom } from "@/lib/chat";

interface ProjectChatProps {
  projectId: string;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolveRoom = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const roomId = await ensureProjectChatRoom(projectId);
        if (!roomId) {
          setError("Project not found.");
          setChatRoomId(null);
          return;
        }
        setChatRoomId(roomId);
      } catch (err) {
        console.error(err);
        setError("Unable to open project chat.");
      } finally {
        setLoading(false);
      }
    };

    void resolveRoom();
  }, [projectId]);

  if (!projectId) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          No project identifier provided.
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          Loading chat for this project...
        </p>
      </Card>
    );
  }

  if (error || !chatRoomId) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          {error ?? "Unable to open project chat."}
        </p>
      </Card>
    );
  }

  return <ChatRoom chatRoomId={chatRoomId} type="project" />;
}
