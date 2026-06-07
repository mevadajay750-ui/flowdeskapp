"use client";

import { FileText, Folder, Paperclip } from "lucide-react";
import Link from "next/link";

import { formatItemDate } from "@/lib/projectFiles";
import type { ProjectFileItem } from "@/types";

interface FileItemRowProps {
  projectId: string;
  item: ProjectFileItem;
  readOnly: boolean;
  onDelete: (item: ProjectFileItem) => void;
  deleting: boolean;
}

function ItemIcon({ type }: { type: ProjectFileItem["type"] }) {
  if (type === "folder") {
    return <Folder className="h-4 w-4 text-amber-500" />;
  }
  if (type === "page") {
    return <FileText className="h-4 w-4 text-sky-500" />;
  }
  return <Paperclip className="h-4 w-4 text-textSecondary" />;
}

export function FileItemRow({
  projectId,
  item,
  readOnly,
  onDelete,
  deleting,
}: FileItemRowProps) {
  const updatedAt = item.updatedAt ?? item.createdAt;
  const href =
    item.type === "folder"
      ? `/projects/${projectId}/files?folder=${item.id}`
      : `/projects/${projectId}/files/${item.id}`;

  return (
    <div className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-surface-secondary/60">
      <ItemIcon type={item.type} />
      <Link href={href} className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-textPrimary">
          {item.name}
        </div>
        <div className="mt-0.5 truncate text-xs text-textSecondary">
          {item.createdByName} · {formatItemDate(updatedAt)}
        </div>
      </Link>
      {!readOnly && (
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={deleting}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      )}
    </div>
  );
}
