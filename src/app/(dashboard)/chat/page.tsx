"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { format } from "date-fns";
import { ChevronRight, MessageSquare } from "lucide-react";

import { db } from "@/app/firebase";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChatMessage, Project } from "@/types";
import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

interface ChatListItem {
  projectId: string;
  projectName: string;
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

export default function ChatListPage() {
  const { user, loading } = useAuthStore();

  const [items, setItems] = useState<ChatListItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setFetching(true);
      setError(null);

      try {
        const canViewAll = hasPermission(user.role, "view_all_projects");

        let projectsSnapshot;
        if (canViewAll) {
          projectsSnapshot = await getDocs(collection(db, "projects"));
        } else {
          const projectsQuery = query(
            collection(db, "projects"),
            where("memberIds", "array-contains", user.uid)
          );
          projectsSnapshot = await getDocs(projectsQuery);
        }

        const projects: Project[] = [];
        projectsSnapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Project, "id">;
          const project: Project = {
            id: docSnap.id,
            ...data,
          };
          projects.push(project);
        });

        const activeProjects = projects.filter(
          (project) => project.status !== "archived"
        );

        if (activeProjects.length === 0) {
          setItems([]);
          return;
        }

        const chatItems = await Promise.all(
          activeProjects.map(async (project): Promise<ChatListItem> => {
            const messagesRef = collection(
              db,
              "projects",
              project.id,
              "messages"
            );
            const messagesQuery = query(
              messagesRef,
              orderBy("createdAt", "desc"),
              limit(1)
            );

            const snapshot = await getDocs(messagesQuery);

            if (snapshot.empty) {
              return {
                projectId: project.id,
                projectName: project.name,
                lastMessagePreview: null,
                lastMessageCreatedAt: null,
              };
            }

            const messageDoc = snapshot.docs[0];
            const data = messageDoc.data() as Omit<ChatMessage, "id">;

            const preview =
              (data.content && data.content.trim()) ||
              data.fileName ||
              (data.messageType === "image"
                ? "Image"
                : data.messageType === "file"
                ? "File"
                : "Message");

            return {
              projectId: project.id,
              projectName: project.name,
              lastMessagePreview: preview,
              lastMessageCreatedAt: data.createdAt ?? null,
            };
          })
        );

        chatItems.sort((a, b) => {
          const aTime = a.lastMessageCreatedAt
            ? new Date(
                typeof a.lastMessageCreatedAt.toDate === "function"
                  ? a.lastMessageCreatedAt.toDate()
                  : a.lastMessageCreatedAt
              ).getTime()
            : 0;
          const bTime = b.lastMessageCreatedAt
            ? new Date(
                typeof b.lastMessageCreatedAt.toDate === "function"
                  ? b.lastMessageCreatedAt.toDate()
                  : b.lastMessageCreatedAt
              ).getTime()
            : 0;

          return bTime - aTime;
        });

        setItems(chatItems);
      } catch (err) {
        console.error(err);
        setError("Failed to load chats.");
      } finally {
        setFetching(false);
      }
    };

    if (!loading && user) {
      void load();
    }
  }, [loading, user]);

  const hasProjects = useMemo(() => items.length > 0, [items]);

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading your chats...</div>
    );
  }

  if (!user) {
    return null;
  }

  const isAdmin = hasPermission(user.role, "view_all_projects");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">Chat</h1>
          <p className="mt-1 text-sm text-textSecondary">
            See conversations across all projects you&apos;re part of.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {fetching ? (
        <Card className="text-sm text-textSecondary">Loading chats...</Card>
      ) : !hasProjects ? (
        <EmptyState
          title={isAdmin ? "No project chats yet" : "No project access yet"}
          description={
            isAdmin
              ? "Create a project to start a shared space for your team to collaborate."
              : "Once you’re added to a project, its chat will appear here."
          }
        />
      ) : (
        <Card className="rounded-2xl bg-slate-50/80 p-0 shadow-sm">
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const hasMessages = !!item.lastMessagePreview;
              return (
                <Link
                  key={item.projectId}
                  href={`/chat/${item.projectId}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-100/80"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-textPrimary">
                        {item.projectName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-textSecondary">
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
      )}
    </div>
  );
}

