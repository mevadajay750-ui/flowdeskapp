"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";

import { groupInitials } from "@/lib/chat";

export interface GroupListItem {
  chatRoomId: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  memberCount: number;
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

interface GroupListRowProps {
  item: GroupListItem;
}

export function GroupListRow({ item }: GroupListRowProps) {
  const hasMessages = !!item.lastMessagePreview;

  return (
    <Link
      href={`/chat/groups/${item.chatRoomId}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-100/80"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {item.avatarUrl ? (
          <img
            src={item.avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {groupInitials(item.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-textPrimary">
            {item.name}
          </div>
          {item.description && (
            <div className="mt-0.5 line-clamp-1 text-xs text-textSecondary">
              {item.description}
            </div>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-xs text-textSecondary">
            <span>{item.memberCount} members</span>
            <span className="text-slate-300">·</span>
            <span className="line-clamp-1">
              {hasMessages ? item.lastMessagePreview : "No messages yet"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-2 text-xs text-textSecondary">
        {hasMessages && (
          <span className="whitespace-nowrap">
            {formatTime(item.lastMessageCreatedAt)}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </div>
    </Link>
  );
}
