"use client";

import { useParams } from "next/navigation";

import { ProjectChat } from "@/components/chat/ProjectChat";

export default function ProjectChatRoutePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  if (!projectId) {
    return (
      <div className="text-sm text-textSecondary">
        No project identifier provided.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Project Chat</h1>
        <p className="mt-1 text-sm text-textSecondary">
          Collaborate with your project team in real time.
        </p>
      </div>

      <ProjectChat projectId={projectId} />
    </div>
  );
}

