"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";

import { groupInitials } from "@/lib/chat";

export interface DmListItem {
  chatRoomId: string;
  peerName: string;
  peerPhotoUrl?: string;
  lastMessagePreview: string | null;
  lastMessageCreatedAt: unknown;
}

function formatTime(value: unknown): string {
  if (!value) return "";

  try {
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate: () => Date }).toDate === "function"
    ) {
      return format((value as { toDate: () => Date }).toDate(), "HH:mm");
    }
    const date = new Date(value as string | number | Date);
    if (!Number.isNaN(date.getTime())) {
      return format(date, "HH:mm");
    }
  } catch {
    // ignore
  }

  return "";
}

interface DmListRowProps {
  item: DmListItem;
}

export function DmListRow({ item }: DmListRowProps) {
  const hasMessages = !!item.lastMessagePreview;

  return (
    <Link
      href={`/chat/dms/${item.chatRoomId}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-surface-secondary/80"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {item.peerPhotoUrl ? (
          <img
            src={item.peerPhotoUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {groupInitials(item.peerName)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-textPrimary">
            {item.peerName}
          </div>
          <div className="mt-0.5 line-clamp-1 text-xs text-textSecondary">
            {hasMessages ? item.lastMessagePreview : "No messages yet"}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-2 text-xs text-textSecondary">
        {hasMessages && (
          <span className="whitespace-nowrap">
            {formatTime(item.lastMessageCreatedAt)}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-textSecondary" />
      </div>
    </Link>
  );
}
