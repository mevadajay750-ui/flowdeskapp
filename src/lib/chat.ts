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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/app/firebase";
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
    const participant: ChatRoomParticipant = {
      uid: member.uid,
      name:
        profile?.name?.trim() ||
        profile?.email ||
        member.uid.slice(0, 8),
      role: member.projectRole,
    };
    if (profile?.photoURL) {
      participant.photoURL = profile.photoURL;
    }
    return participant;
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

export type UserProfileFields = Pick<AppUser, "name" | "email" | "photoURL"> & {
  designation?: string;
};

export async function fetchUsersByIds(
  uids: string[]
): Promise<Map<string, UserProfileFields>> {
  const uniqueIds = [...new Set(uids.filter(Boolean))];
  const map = new Map<string, UserProfileFields>();

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
          designation: data.designation,
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

const GROUP_AVATAR_MAX_BYTES = 3 * 1024 * 1024;

export function usersToParticipants(
  uids: string[],
  usersById: Map<string, UserProfileFields>
): ChatRoomParticipant[] {
  return uids.map((uid) => {
    const profile = usersById.get(uid);
    const participant: ChatRoomParticipant = {
      uid,
      name:
        profile?.name?.trim() ||
        profile?.email ||
        uid.slice(0, 8),
    };
    if (profile?.photoURL) {
      participant.photoURL = profile.photoURL;
    }
    if (profile?.designation) {
      participant.designation = profile.designation;
    }
    return participant;
  });
}

export function buildDirectKey(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

export function getDirectPeer(
  participants: ChatRoomParticipant[],
  currentUid: string
): ChatRoomParticipant | undefined {
  return participants.find((p) => p.uid !== currentUid);
}

export function directPeerDisplay(
  room: Pick<ChatRoom, "participants">,
  currentUid: string
): { name: string; photoURL?: string; designation?: string; uid?: string } {
  const peer = getDirectPeer(room.participants ?? [], currentUid);
  return {
    uid: peer?.uid,
    name: peer?.name ?? "Conversation",
    photoURL: peer?.photoURL,
    designation: peer?.designation,
  };
}

export async function fetchUserProfile(
  uid: string
): Promise<UserProfileFields | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as AppUser;
  return {
    name: data.name,
    email: data.email,
    photoURL: data.photoURL,
    designation: data.designation,
  };
}

export async function findDirectChatRoom(
  currentUid: string,
  otherUid: string
): Promise<string | null> {
  const directKey = buildDirectKey(currentUid, otherUid);

  // Must filter by participantIds so the query satisfies chatRooms read rules.
  const roomsQuery = query(
    collection(db, "chatRooms"),
    where("participantIds", "array-contains", currentUid),
    where("type", "==", "direct")
  );
  const snapshot = await getDocs(roomsQuery);
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Omit<ChatRoom, "id">;
    const ids = data.participantIds ?? [];
    if (
      ids.includes(otherUid) &&
      ids.length === 2 &&
      (data.directKey == null || data.directKey === directKey)
    ) {
      return docSnap.id;
    }
  }

  return null;
}

export interface CreateDirectChatRoomInput {
  creator: Pick<AppUser, "uid" | "name" | "email" | "photoURL">;
  otherUid: string;
}

export async function createDirectChatRoom(
  input: CreateDirectChatRoomInput
): Promise<string> {
  const { creator, otherUid } = input;
  if (creator.uid === otherUid) {
    throw new Error("Cannot start a conversation with yourself.");
  }

  const usersById = await fetchUsersByIds([creator.uid, otherUid]);
  usersById.set(creator.uid, {
    name: creator.name,
    email: creator.email,
    photoURL: creator.photoURL,
    designation: usersById.get(creator.uid)?.designation,
  });

  const allUids = [creator.uid, otherUid];
  const participants = usersToParticipants(allUids, usersById);
  const participantIds = participantIdsFromParticipants(participants);
  const directKey = buildDirectKey(creator.uid, otherUid);

  const chatRoomRef = doc(collection(db, "chatRooms"));
  await setDoc(chatRoomRef, {
    type: "direct",
    directKey,
    participants,
    participantIds,
    createdBy: creator.uid,
    createdAt: serverTimestamp(),
  });

  return chatRoomRef.id;
}

export async function getOrCreateDirectChatRoom(
  input: CreateDirectChatRoomInput
): Promise<string> {
  const existing = await findDirectChatRoom(input.creator.uid, input.otherUid);
  if (existing) return existing;
  return createDirectChatRoom(input);
}

export function isGroupAdmin(
  chatRoom: Pick<ChatRoom, "admins">,
  uid: string
): boolean {
  return chatRoom.admins?.includes(uid) ?? false;
}

export function groupInitials(name?: string): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export async function fetchApprovedUsers(): Promise<AppUser[]> {
  const usersQuery = query(
    collection(db, "users"),
    where("status", "==", "approved")
  );
  const snapshot = await getDocs(usersQuery);
  const users: AppUser[] = [];
  snapshot.forEach((docSnap) => {
    users.push({ uid: docSnap.id, ...docSnap.data() } as AppUser);
  });
  return users.sort((a, b) => a.name.localeCompare(b.name));
}

export function validateGroupAvatarFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please select an image file.";
  }
  if (file.size > GROUP_AVATAR_MAX_BYTES) {
    return "Image must be 3MB or smaller.";
  }
  return null;
}

export async function uploadGroupAvatar(
  chatRoomId: string,
  file: File
): Promise<string> {
  const validationError = validateGroupAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const storageRef = ref(storage, `chat-groups/${chatRoomId}/avatar`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export interface CreateGroupChatRoomInput {
  name: string;
  description?: string;
  participantUids: string[];
  avatarFile?: File | null;
  creator: Pick<AppUser, "uid" | "name" | "email" | "photoURL">;
}

export async function createGroupChatRoom(
  input: CreateGroupChatRoomInput
): Promise<string> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Group name is required.");
  }

  const allUids = [
    ...new Set([input.creator.uid, ...input.participantUids.filter(Boolean)]),
  ];

  const usersById = await fetchUsersByIds(allUids);
  usersById.set(input.creator.uid, {
    name: input.creator.name,
    email: input.creator.email,
    photoURL: input.creator.photoURL,
  });

  const participants = usersToParticipants(allUids, usersById);
  const participantIds = participantIdsFromParticipants(participants);

  const chatRoomRef = doc(collection(db, "chatRooms"));

  await setDoc(chatRoomRef, {
    type: "group",
    name: trimmedName,
    description: input.description?.trim() || "",
    avatarUrl: null,
    participants,
    participantIds,
    admins: [input.creator.uid],
    createdBy: input.creator.uid,
    createdAt: serverTimestamp(),
  });

  if (input.avatarFile) {
    const avatarUrl = await uploadGroupAvatar(chatRoomRef.id, input.avatarFile);
    await updateDoc(chatRoomRef, { avatarUrl });
  }

  return chatRoomRef.id;
}

export interface UpdateGroupChatRoomInput {
  name?: string;
  description?: string;
  avatarUrl?: string | null;
}

export async function updateGroupChatRoom(
  chatRoomId: string,
  patch: UpdateGroupChatRoomInput
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error("Group name is required.");
    updates.name = trimmed;
  }
  if (patch.description !== undefined) {
    updates.description = patch.description.trim();
  }
  if (patch.avatarUrl !== undefined) {
    updates.avatarUrl = patch.avatarUrl;
  }

  if (Object.keys(updates).length === 0) return;

  await updateDoc(doc(db, "chatRooms", chatRoomId), updates);
}

export async function addGroupMembers(
  chatRoomId: string,
  uids: string[]
): Promise<void> {
  const uniqueNewUids = [...new Set(uids.filter(Boolean))];
  if (uniqueNewUids.length === 0) return;

  const roomRef = doc(db, "chatRooms", chatRoomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    throw new Error("Group not found.");
  }

  const room = { id: roomSnap.id, ...roomSnap.data() } as ChatRoom;
  if (room.type !== "group") {
    throw new Error("Not a group chat room.");
  }

  const existingIds = new Set(room.participantIds ?? []);
  const toAdd = uniqueNewUids.filter((uid) => !existingIds.has(uid));
  if (toAdd.length === 0) return;

  const usersById = await fetchUsersByIds(toAdd);
  const newParticipants = usersToParticipants(toAdd, usersById);
  const participants = [...room.participants, ...newParticipants];
  const participantIds = participantIdsFromParticipants(participants);

  await updateDoc(roomRef, { participants, participantIds });
}

export async function removeGroupMember(
  chatRoomId: string,
  uid: string
): Promise<void> {
  const roomRef = doc(db, "chatRooms", chatRoomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    throw new Error("Group not found.");
  }

  const room = { id: roomSnap.id, ...roomSnap.data() } as ChatRoom;
  if (room.type !== "group") {
    throw new Error("Not a group chat room.");
  }

  const admins = room.admins ?? [];
  if (admins.includes(uid) && admins.length === 1) {
    throw new Error("Cannot remove the last group admin.");
  }

  const participants = room.participants.filter((p) => p.uid !== uid);
  if (participants.length === room.participants.length) {
    return;
  }

  const participantIds = participantIdsFromParticipants(participants);
  const updatedAdmins = admins.filter((adminUid) => adminUid !== uid);

  await updateDoc(roomRef, {
    participants,
    participantIds,
    admins: updatedAdmins,
  });
}
