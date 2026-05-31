import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/app/firebase";
import type {
  AppUser,
  ChatMessage,
  ChatRoom,
  ChatRoomParticipant,
  MessageType,
  Project,
  ProjectMember,
} from "@/types";

export function projectMembersToParticipants(
  members: ProjectMember[],
  usersById: Map<string, Pick<AppUser, "name" | "email" | "photoURL">>
): ChatRoomParticipant[] {
  return members.map((member) => {
    const profile = usersById.get(member.uid);
    return {
      uid: member.uid,
      name:
        profile?.name?.trim() ||
        profile?.email ||
        member.uid.slice(0, 8),
      role: member.projectRole,
      photoURL: profile?.photoURL,
    };
  });
}

export function participantIdsFromParticipants(
  participants: ChatRoomParticipant[]
): string[] {
  return [...new Set(participants.map((p) => p.uid))];
}

export function lastMessagePreviewFromData(data: {
  messageType?: MessageType | string;
  content?: string;
  fileName?: string;
}): string {
  const trimmed = data.content?.trim();
  if (trimmed) return trimmed;

  if (data.fileName) return data.fileName;

  switch (data.messageType) {
    case "image":
      return "Image";
    case "file":
      return "File";
    case "code":
      return "Code snippet";
    default:
      return "Message";
  }
}

export function buildChatRoomLastMessage(
  message: Pick<
    ChatMessage,
    "senderId" | "messageType" | "content" | "fileName"
  > & { createdAt?: any }
) {
  return {
    text: lastMessagePreviewFromData(message),
    senderId: message.senderId,
    createdAt: message.createdAt ?? serverTimestamp(),
    messageType: message.messageType,
  };
}

export async function fetchUsersByIds(
  uids: string[]
): Promise<Map<string, Pick<AppUser, "name" | "email" | "photoURL">>> {
  const uniqueIds = [...new Set(uids.filter(Boolean))];
  const map = new Map<string, Pick<AppUser, "name" | "email" | "photoURL">>();

  if (uniqueIds.length === 0) return map;

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    chunks.push(uniqueIds.slice(i, i + 10));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const usersQuery = query(
        collection(db, "users"),
        where(documentId(), "in", chunk)
      );
      const snapshot = await getDocs(usersQuery);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AppUser;
        map.set(docSnap.id, {
          name: data.name,
          email: data.email,
          photoURL: data.photoURL,
        });
      });
    })
  );

  return map;
}

export async function createProjectChatRoom(
  projectId: string,
  project: Pick<Project, "name" | "createdBy" | "members" | "memberIds">,
  creator: Pick<AppUser, "uid" | "name" | "email" | "photoURL">
): Promise<string> {
  const usersById = await fetchUsersByIds(
    project.memberIds ?? project.members.map((m) => m.uid)
  );
  usersById.set(creator.uid, {
    name: creator.name,
    email: creator.email,
    photoURL: creator.photoURL,
  });

  const participants = projectMembersToParticipants(
    project.members,
    usersById
  );
  const participantIds = participantIdsFromParticipants(participants);

  const chatRoomRef = doc(collection(db, "chatRooms"));
  await setDoc(chatRoomRef, {
    type: "project",
    projectId,
    name: project.name,
    participants,
    participantIds,
    createdBy: project.createdBy,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "projects", projectId), {
    chatRoomId: chatRoomRef.id,
  });

  return chatRoomRef.id;
}

export async function syncProjectChatRoomParticipants(
  projectId: string,
  members: ProjectMember[]
): Promise<void> {
  const projectRef = doc(db, "projects", projectId);
  const projectSnap = await getDoc(projectRef);
  if (!projectSnap.exists()) return;

  const project = projectSnap.data() as Omit<Project, "id">;
  let chatRoomId: string | undefined = project.chatRoomId;

  if (!chatRoomId) {
    const ensuredId = await ensureProjectChatRoom(projectId);
    if (!ensuredId) return;
    chatRoomId = ensuredId;
  }

  const usersById = await fetchUsersByIds(members.map((m) => m.uid));
  const participants = projectMembersToParticipants(members, usersById);
  const participantIds = participantIdsFromParticipants(participants);

  await updateDoc(doc(db, "chatRooms", chatRoomId), {
    participants,
    participantIds,
  });
}

export async function ensureProjectChatRoom(projectId: string): Promise<string | null> {
  const projectRef = doc(db, "projects", projectId);
  const projectSnap = await getDoc(projectRef);

  if (!projectSnap.exists()) return null;

  const data = projectSnap.data() as Omit<Project, "id">;
  if (data.chatRoomId) return data.chatRoomId;

  const members = (data.members || []) as ProjectMember[];
  const memberIds =
    data.memberIds ?? members.map((m) => m.uid);

  const usersById = await fetchUsersByIds(memberIds);
  const participants = projectMembersToParticipants(members, usersById);
  const participantIds = participantIdsFromParticipants(participants);

  const chatRoomRef = doc(collection(db, "chatRooms"));
  const batch = writeBatch(db);

  batch.set(chatRoomRef, {
    type: "project",
    projectId,
    name: data.name,
    participants,
    participantIds,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
  });
  batch.update(projectRef, { chatRoomId: chatRoomRef.id });
  await batch.commit();

  return chatRoomRef.id;
}

export async function updateChatRoomLastMessage(
  chatRoomId: string,
  message: Pick<
    ChatMessage,
    "senderId" | "messageType" | "content" | "fileName"
  >
): Promise<void> {
  await updateDoc(doc(db, "chatRooms", chatRoomId), {
    lastMessage: buildChatRoomLastMessage({
      ...message,
      createdAt: serverTimestamp(),
    }),
  });
}

export function isChatRoomParticipant(
  chatRoom: Pick<ChatRoom, "participants" | "participantIds">,
  uid: string
): boolean {
  if (chatRoom.participantIds?.includes(uid)) return true;
  return chatRoom.participants.some((p) => p.uid === uid);
}

export function chatRoomSubtitle(type: ChatRoom["type"]): string {
  switch (type) {
    case "project":
      return "Messages are visible to all members of this project.";
    case "group":
      return "Messages are visible to all members of this group.";
    case "direct":
      return "Direct message conversation.";
    default:
      return "Conversation";
  }
}
