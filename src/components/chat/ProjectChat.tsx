"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  endBefore,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { format } from "date-fns";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Code2,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";

import { db, storage } from "@/app/firebase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ChatMessage, Project, ProjectMember } from "@/types";
import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

interface ProjectChatProps {
  projectId: string;
}

function normalizeMembers(
  data: Omit<Project, "id">
): { members: ProjectMember[]; memberIds: string[] } {
  const rawMembers = ((data as any).members || []) as any[];

  const normalizedMembers: ProjectMember[] = rawMembers.map(
    (entry: any): ProjectMember => {
      if (typeof entry === "string") {
        return {
          uid: entry,
          projectRole: "Member",
          assignedAt: data.createdAt,
        };
      }
      return {
        uid: entry.uid,
        projectRole: entry.projectRole || "Member",
        assignedAt: entry.assignedAt ?? data.createdAt,
      };
    }
  );

  const memberIdsFromMembers =
    normalizedMembers.map((m) => m.uid) ?? ([] as string[]);

  const memberIds =
    (Array.isArray((data as any).memberIds) &&
      ((data as any).memberIds as string[])) ||
    memberIdsFromMembers;

  return { members: normalizedMembers, memberIds };
}

function formatMessageTime(value: any): string {
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

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const { user, loading: authLoading } = useAuthStore();

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("");
  const [codeText, setCodeText] = useState("");

  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const oldestMessageDocRef = useRef<any | null>(null);

  const canSend = useMemo(
    () =>
      !!user &&
      !accessDenied &&
      !sending &&
      !uploading &&
      inputValue.trim().length > 0 &&
      !!projectId,
    [user, accessDenied, sending, uploading, inputValue, projectId]
  );

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || authLoading) return;

      if (!user) {
        setAccessDenied(true);
        setLoadingProject(false);
        return;
      }

      setLoadingProject(true);
      setError(null);

      try {
        const projectRef = doc(db, "projects", projectId);
        const snap = await getDoc(projectRef);

        if (!snap.exists()) {
          setError("Project not found.");
          setProject(null);
          setAccessDenied(true);
          return;
        }

        const data = snap.data() as Omit<Project, "id">;
        const { members, memberIds } = normalizeMembers(data);

        const loadedProject: Project = {
          id: snap.id,
          ...data,
          members,
          memberIds,
        };

        const canViewAllProjectsChat = hasPermission(
          user.role,
          "view_all_projects"
        );

        const isMember =
          memberIds.includes(user.uid) ||
          members.some((member) => member.uid === user.uid) ||
          canViewAllProjectsChat;

        if (!isMember) {
          setAccessDenied(true);
          setProject(loadedProject);
          return;
        }

        setProject(loadedProject);
        setAccessDenied(false);
      } catch (err) {
        console.error(err);
        setError("Unable to load project.");
        setAccessDenied(true);
      } finally {
        setLoadingProject(false);
      }
    };

    void loadProject();
  }, [projectId, authLoading, user]);

  useEffect(() => {
    if (!projectId || !user || accessDenied) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    setError(null);

    const messagesRef = collection(db, "projects", projectId, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const items: ChatMessage[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatMessage, "id">;
          items.push({
            id: docSnap.id,
            ...data,
          });
        });

        setMessages(items);
        if (snapshot.docs.length > 0) {
          oldestMessageDocRef.current = snapshot.docs[0];
          setHasMoreMessages(snapshot.docs.length === 100);
        } else {
          oldestMessageDocRef.current = null;
          setHasMoreMessages(false);
        }
        setLoadingMessages(false);
      },
      (err) => {
        console.error(err);
        setError("Unable to load messages.");
        setLoadingMessages(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [projectId, user, accessDenied]);

  useEffect(() => {
    if (!scrollAnchorRef.current) return;

    scrollAnchorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  const handleSend = async () => {
    if (!canSend || !projectId || !user) return;

    const content = inputValue.trim();
    if (!content) return;

    setSending(true);
    setError(null);

    try {
      await addDoc(collection(db, "projects", projectId, "messages"), {
        senderId: user.uid,
        senderName: user.name || user.email || "Unknown",
        messageType: "text",
        content,
        createdAt: serverTimestamp(),
      });

      setInputValue("");
    } catch (err) {
      console.error(err);
      setError("Unable to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleImageInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !projectId || !user || accessDenied) return;

    if (!file.type.startsWith("image/")) {
      const message = "Please select a valid image file (JPG, PNG, WEBP).";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      const message = "Image size must be less than 5MB.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const messagesRef = collection(db, "projects", projectId, "messages");
      const messageRef = doc(messagesRef);

      const storageRef = ref(
        storage,
        `projects/${projectId}/chat/${messageRef.id}`
      );
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await setDoc(messageRef, {
        senderId: user.uid,
        senderName: user.name || user.email || "Unknown",
        messageType: "image",
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      const message = "Unable to upload image. Please try again.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !projectId || !user || accessDenied) return;

    const allowedExtensions = ["pdf", "doc", "docx", "txt", "zip"];
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!allowedExtensions.includes(extension)) {
      const message =
        "Unsupported file type. Allowed: PDF, DOC, DOCX, TXT, ZIP.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      const message = "File size must be less than 10MB.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const messagesRef = collection(db, "projects", projectId, "messages");
      const messageRef = doc(messagesRef);

      const storageRef = ref(
        storage,
        `projects/${projectId}/chat/${messageRef.id}`
      );
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      await setDoc(messageRef, {
        senderId: user.uid,
        senderName: user.name || user.email || "Unknown",
        messageType: "file",
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      const message = "Unable to upload file. Please try again.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSendCode = async () => {
    if (!projectId || !user || accessDenied) return;

    const trimmedCode = codeText.trim();
    const trimmedLanguage = codeLanguage.trim();

    if (!trimmedCode) {
      const message = "Code snippet cannot be empty.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
      return;
    }

    setSending(true);
    setError(null);

    try {
      const payload: any = {
        senderId: user.uid,
        senderName: user.name || user.email || "Unknown",
        messageType: "code",
        content: trimmedCode,
        createdAt: serverTimestamp(),
      };

      if (trimmedLanguage) {
        payload.language = trimmedLanguage;
      }

      await addDoc(collection(db, "projects", projectId, "messages"), payload);

      setCodeText("");
      setCodeLanguage("");
      setCodeModalOpen(false);
    } catch (err) {
      console.error(err);
      const message = "Unable to send code snippet. Please try again.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
    } finally {
      setSending(false);
    }
  };

  const handleLoadOlderMessages = async () => {
    if (!projectId || !user || accessDenied) return;
    if (loadingOlder) return;

    const oldest = oldestMessageDocRef.current;
    if (!oldest) return;

    setLoadingOlder(true);
    setError(null);

    try {
      const messagesRef = collection(db, "projects", projectId, "messages");
      const olderQuery = query(
        messagesRef,
        orderBy("createdAt", "asc"),
        endBefore(oldest),
        limit(100)
      );
      const snapshot = await getDocs(olderQuery);

      if (!snapshot.empty) {
        const olderItems: ChatMessage[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<ChatMessage, "id">;
          olderItems.push({
            id: docSnap.id,
            ...data,
          });
        });

        setMessages((current) => [...olderItems, ...current]);
        oldestMessageDocRef.current = snapshot.docs[0];
        setHasMoreMessages(snapshot.docs.length === 100);
      } else {
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error(err);
      const message = "Unable to load older messages. Please try again.";
      setError(message);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleCopyCode = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Code copied to clipboard.");
      }
    } catch (err) {
      console.error(err);
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Unable to copy code.");
      }
    }
  };

  if (!projectId) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          No project identifier provided.
        </p>
      </Card>
    );
  }

  if (authLoading || loadingProject) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          Loading chat for this project...
        </p>
      </Card>
    );
  }

  if (accessDenied) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <p className="px-4 py-6 text-sm text-textSecondary">
          Access Denied. You are not a member of this project.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <Card className="flex h-[560px] flex-col rounded-2xl shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-white/80 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-textPrimary">
              {project?.name ?? "Project chat"}
            </div>
            <div className="text-xs text-textSecondary">
              Messages are visible to all members of this project.
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4">
          {loadingMessages ? (
            <p className="text-sm text-textSecondary">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-textSecondary">
              No messages yet. Start the conversation for this project.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {hasMoreMessages && (
                <div className="mb-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void handleLoadOlderMessages()}
                    disabled={loadingOlder}
                    className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-textSecondary shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loadingOlder
                      ? "Loading earlier messages..."
                      : "Load older messages"}
                  </button>
                </div>
              )}
              {messages.map((message) => {
                const isOwn = message.senderId === user?.uid;
                const type = message.messageType ?? "text";
                const alignmentClass = isOwn ? "justify-end" : "justify-start";
                let bubbleClass = isOwn
                  ? "bg-primary text-white rounded-2xl rounded-br-sm shadow-xs"
                  : "bg-white text-textPrimary rounded-2xl rounded-bl-sm shadow-xs border border-slate-200/80";

                if (type === "code") {
                  bubbleClass =
                    "bg-slate-900 text-slate-50 rounded-2xl shadow-md";
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${alignmentClass} text-sm`}
                  >
                    <div className="max-w-[75%] space-y-1.5">
                      {!isOwn && (
                        <div className="text-xs font-medium text-textSecondary">
                          {message.senderName}
                        </div>
                      )}
                      <div
                        className={`inline-flex rounded-2xl px-3 py-2 text-sm ${bubbleClass}`}
                      >
                        {type === "image" && message.fileUrl ? (
                          <a
                            href={message.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex flex-col gap-1"
                          >
                            <img
                              src={message.fileUrl}
                              alt={message.fileName || "Image attachment"}
                              className="max-h-72 max-w-[300px] rounded-md object-cover"
                            />
                            {(message.fileName || message.fileSize) && (
                              <span className="text-[11px] font-medium text-slate-200 group-hover:underline">
                                {message.fileName}
                                {message.fileSize
                                  ? ` • ${formatFileSize(message.fileSize)}`
                                  : null}
                              </span>
                            )}
                          </a>
                        ) : type === "file" && message.fileUrl ? (
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200/80 text-slate-700">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="max-w-xs truncate text-xs font-medium">
                                {message.fileName ?? "Attachment"}
                              </div>
                              {message.fileSize && (
                                <div className="text-[11px] text-slate-300">
                                  {formatFileSize(message.fileSize)}
                                </div>
                              )}
                              <a
                                href={message.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-100 hover:underline"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </a>
                            </div>
                          </div>
                        ) : type === "code" ? (
                          <div className="flex max-w-[480px] flex-col gap-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                                Code snippet
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleCopyCode(message.content)}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-100 hover:bg-slate-700"
                              >
                                <Copy className="h-3 w-3" />
                                Copy
                              </button>
                            </div>
                            <pre className="max-h-64 overflow-x-auto overflow-y-auto rounded-md bg-slate-950/80 p-2 text-xs font-mono leading-relaxed">
                              <code className="whitespace-pre">
                                {message.content}
                              </code>
                            </pre>
                          </div>
                        ) : (
                          <span className="whitespace-pre-wrap wrap-break-word">
                            {message.content}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-textSecondary">
                        {formatMessageTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={scrollAnchorRef} />
        </div>

        <div className="border-t border-border bg-white px-4 py-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <div className="flex-1 space-y-2">
              <textarea
                rows={1}
                value={inputValue}
                disabled={sending || uploading || accessDenied}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !sending &&
                    !uploading
                  ) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Type a message... Press Enter to send, Shift+Enter for a new line."
                className="max-h-32 w-full resize-none rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-textPrimary outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={sending || uploading || accessDenied}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-textSecondary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span className="sr-only">Upload image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploading || accessDenied}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-textSecondary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="sr-only">Upload file</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeModalOpen(true)}
                    disabled={sending || uploading || accessDenied}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-textSecondary hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Code2 className="h-4 w-4" />
                    <span className="sr-only">Send code snippet</span>
                  </button>
                </div>
                {uploading && (
                  <div className="text-[11px] text-textSecondary">
                    Uploading...
                  </div>
                )}
              </div>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!canSend}
              className="shrink-0"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </form>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageInputChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.zip"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </Card>

      {codeModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-textPrimary">
                Code snippet
              </h2>
              <p className="mt-1 text-xs text-textSecondary">
                Share a formatted code snippet with your project team.
              </p>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-textSecondary">
                  Language (optional)
                </label>
                <input
                  type="text"
                  value={codeLanguage}
                  onChange={(event) => setCodeLanguage(event.target.value)}
                  placeholder="e.g. TypeScript, Python, SQL"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-textSecondary">
                  Code
                </label>
                <textarea
                  rows={8}
                  value={codeText}
                  onChange={(event) => setCodeText(event.target.value)}
                  placeholder="Paste or write your code here..."
                  className="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCodeModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSendCode()}
                disabled={sending || !codeText.trim()}
              >
                {sending ? "Sending..." : "Send code"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

