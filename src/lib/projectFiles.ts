import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/app/firebase";
import type {
  AppUser,
  ProjectFileItem,
  ProjectFileTreeNode,
} from "@/types";

export const MAX_FOLDER_DEPTH = 5;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "txt",
  "zip",
  "png",
  "jpg",
  "jpeg",
] as const;

const NAME_MIN = 2;
const NAME_MAX = 80;

function fileItemsCollection(projectId: string) {
  return collection(db, "projects", projectId, "fileItems");
}

function mapDocToItem(
  projectId: string,
  id: string,
  data: Omit<ProjectFileItem, "id" | "projectId">
): ProjectFileItem {
  return {
    id,
    projectId,
    ...data,
  };
}

export function validateItemName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN) {
    return `Name must be at least ${NAME_MIN} characters.`;
  }
  if (trimmed.length > NAME_MAX) {
    return `Name must be at most ${NAME_MAX} characters.`;
  }
  return null;
}

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function validateProjectFile(file: File): string | null {
  const extension = getFileExtension(file.name);
  if (
    !ALLOWED_FILE_EXTENSIONS.includes(
      extension as (typeof ALLOWED_FILE_EXTENSIONS)[number]
    )
  ) {
    return "Unsupported file type. Allowed: PDF, DOC, DOCX, TXT, ZIP, PNG, JPG.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File size must be less than 25MB.";
  }
  return null;
}

function sanitizeStorageFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getSiblingCount(
  items: ProjectFileItem[],
  parentId: string | null
): number {
  return items.filter((item) => item.parentId === parentId).length;
}

export function getFolderDepth(
  items: ProjectFileItem[],
  folderId: string | null
): number {
  if (!folderId) return 0;

  let depth = 0;
  let currentId: string | null = folderId;

  while (currentId) {
    depth += 1;
    const parent = items.find((item) => item.id === currentId);
    if (!parent) break;
    currentId = parent.parentId;
  }

  return depth;
}

export function getChildren(
  items: ProjectFileItem[],
  parentId: string | null
): ProjectFileItem[] {
  return items
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
}

export function buildFileTree(
  items: ProjectFileItem[],
  parentId: string | null = null
): ProjectFileTreeNode[] {
  return getChildren(items, parentId)
    .filter((item) => item.type === "folder")
    .map((folder) => ({
      ...folder,
      children: buildFileTree(items, folder.id),
    }));
}

export function getBreadcrumbPath(
  items: ProjectFileItem[],
  folderId: string | null
): ProjectFileItem[] {
  if (!folderId) return [];

  const path: ProjectFileItem[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const item = items.find((entry) => entry.id === currentId);
    if (!item) break;
    path.unshift(item);
    currentId = item.parentId;
  }

  return path;
}

export function hasChildren(
  items: ProjectFileItem[],
  folderId: string
): boolean {
  return items.some((item) => item.parentId === folderId);
}

function assertValidParent(
  items: ProjectFileItem[],
  parentId: string | null
): void {
  if (!parentId) return;

  const parent = items.find((item) => item.id === parentId);
  if (!parent || parent.type !== "folder") {
    throw new Error("Invalid parent folder.");
  }

  const depth = getFolderDepth(items, parentId);
  if (depth >= MAX_FOLDER_DEPTH) {
    throw new Error(`Folders can be nested up to ${MAX_FOLDER_DEPTH} levels.`);
  }
}

type FileItemUser = Pick<AppUser, "uid" | "name" | "email">;

function displayName(user: FileItemUser): string {
  return user.name || user.email || "Unknown";
}

export async function listProjectFileItems(
  projectId: string
): Promise<ProjectFileItem[]> {
  const snapshot = await getDocs(fileItemsCollection(projectId));
  const items: ProjectFileItem[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as Omit<ProjectFileItem, "id" | "projectId">;
    items.push(mapDocToItem(projectId, docSnap.id, data));
  });

  return items;
}

export async function getProjectFileItem(
  projectId: string,
  itemId: string
): Promise<ProjectFileItem | null> {
  const ref = doc(db, "projects", projectId, "fileItems", itemId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as Omit<ProjectFileItem, "id" | "projectId">;
  return mapDocToItem(projectId, snap.id, data);
}

export async function createFolder(
  projectId: string,
  options: {
    name: string;
    parentId: string | null;
    user: FileItemUser;
    existingItems: ProjectFileItem[];
  }
): Promise<ProjectFileItem> {
  const trimmedName = options.name.trim();
  const nameError = validateItemName(trimmedName);
  if (nameError) throw new Error(nameError);

  assertValidParent(options.existingItems, options.parentId);

  const itemRef = doc(fileItemsCollection(projectId));
  const sortOrder = getSiblingCount(options.existingItems, options.parentId);

  const payload = {
    type: "folder" as const,
    name: trimmedName,
    parentId: options.parentId,
    projectId,
    sortOrder,
    createdBy: options.user.uid,
    createdByName: displayName(options.user),
    createdAt: serverTimestamp(),
  };

  await setDoc(itemRef, payload);

  return {
    id: itemRef.id,
    ...payload,
    createdAt: new Date(),
  };
}

export async function createPage(
  projectId: string,
  options: {
    name: string;
    parentId: string | null;
    user: FileItemUser;
    existingItems: ProjectFileItem[];
  }
): Promise<ProjectFileItem> {
  const trimmedName = options.name.trim();
  const nameError = validateItemName(trimmedName);
  if (nameError) throw new Error(nameError);

  assertValidParent(options.existingItems, options.parentId);

  const itemRef = doc(fileItemsCollection(projectId));
  const sortOrder = getSiblingCount(options.existingItems, options.parentId);

  const payload = {
    type: "page" as const,
    name: trimmedName,
    parentId: options.parentId,
    projectId,
    sortOrder,
    content: "",
    createdBy: options.user.uid,
    createdByName: displayName(options.user),
    createdAt: serverTimestamp(),
  };

  await setDoc(itemRef, payload);

  return {
    id: itemRef.id,
    ...payload,
    createdAt: new Date(),
  };
}

export async function updatePage(
  projectId: string,
  itemId: string,
  updates: { name?: string; content?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim();
    const nameError = validateItemName(trimmedName);
    if (nameError) throw new Error(nameError);
    payload.name = trimmedName;
  }

  if (updates.content !== undefined) {
    payload.content = updates.content;
  }

  await updateDoc(doc(db, "projects", projectId, "fileItems", itemId), payload);
}

export async function renameItem(
  projectId: string,
  itemId: string,
  name: string
): Promise<void> {
  const trimmedName = name.trim();
  const nameError = validateItemName(trimmedName);
  if (nameError) throw new Error(nameError);

  await updateDoc(doc(db, "projects", projectId, "fileItems", itemId), {
    name: trimmedName,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadProjectFile(
  projectId: string,
  options: {
    file: File;
    parentId: string | null;
    user: FileItemUser;
    existingItems: ProjectFileItem[];
  }
): Promise<ProjectFileItem> {
  const validationError = validateProjectFile(options.file);
  if (validationError) throw new Error(validationError);

  assertValidParent(options.existingItems, options.parentId);

  const itemRef = doc(fileItemsCollection(projectId));
  const sortOrder = getSiblingCount(options.existingItems, options.parentId);
  const sanitizedName = sanitizeStorageFileName(options.file.name);
  const storagePath = `projects/${projectId}/files/${itemRef.id}/${sanitizedName}`;

  const basePayload = {
    type: "file" as const,
    name: options.file.name,
    fileName: options.file.name,
    parentId: options.parentId,
    projectId,
    sortOrder,
    mimeType: options.file.type || "application/octet-stream",
    fileSize: options.file.size,
    storagePath,
    createdBy: options.user.uid,
    createdByName: displayName(options.user),
    createdAt: serverTimestamp(),
  };

  await setDoc(itemRef, basePayload);

  try {
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, options.file);
    const downloadUrl = await getDownloadURL(storageRef);

    await updateDoc(itemRef, {
      downloadUrl,
      updatedAt: serverTimestamp(),
    });

    return {
      id: itemRef.id,
      ...basePayload,
      downloadUrl,
      createdAt: new Date(),
    };
  } catch (err) {
    await deleteDoc(itemRef);
    if (
      err instanceof Error &&
      (err.message.includes("unauthorized") ||
        err.message.includes("permission"))
    ) {
      throw new Error(
        "Storage permission denied. Confirm you are a project member and storage rules are deployed."
      );
    }
    throw err;
  }
}

export async function replaceProjectFile(
  projectId: string,
  item: ProjectFileItem,
  file: File
): Promise<ProjectFileItem> {
  if (item.type !== "file") {
    throw new Error("Only file items can be replaced.");
  }

  const validationError = validateProjectFile(file);
  if (validationError) throw new Error(validationError);

  const sanitizedName = sanitizeStorageFileName(file.name);
  const storagePath = `projects/${projectId}/files/${item.id}/${sanitizedName}`;

  if (item.storagePath && item.storagePath !== storagePath) {
    try {
      await deleteObject(ref(storage, item.storagePath));
    } catch {
      // Old file may already be gone.
    }
  }

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  await updateDoc(doc(db, "projects", projectId, "fileItems", item.id), {
    name: file.name,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    storagePath,
    downloadUrl,
    updatedAt: serverTimestamp(),
  });

  return {
    ...item,
    name: file.name,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    storagePath,
    downloadUrl,
  };
}

export async function deleteItem(
  projectId: string,
  item: ProjectFileItem,
  allItems: ProjectFileItem[]
): Promise<void> {
  if (item.type === "folder" && hasChildren(allItems, item.id)) {
    throw new Error("Folder must be empty before it can be deleted.");
  }

  if (item.type === "file" && item.storagePath) {
    try {
      await deleteObject(ref(storage, item.storagePath));
    } catch {
      // Storage object may already be gone.
    }
  }

  await deleteDoc(doc(db, "projects", projectId, "fileItems", item.id));
}

export function formatFileSize(bytes?: number): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatItemDate(value: unknown): string {
  if (!value) return "—";
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const timestamp = value as { toDate: () => Date };
    return timestamp.toDate().toLocaleString();
  }
  return "—";
}

export async function getProjectFileDownloadUrl(
  storagePath: string
): Promise<string> {
  return getDownloadURL(ref(storage, storagePath));
}
