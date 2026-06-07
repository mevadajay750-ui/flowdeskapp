"use client";

import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ProjectFileTreeNode } from "@/types";

interface FolderTreeProps {
  projectId: string;
  tree: ProjectFileTreeNode[];
  currentFolderId: string | null;
}

function FolderTreeNode({
  projectId,
  node,
  currentFolderId,
  depth,
}: {
  projectId: string;
  node: ProjectFileTreeNode;
  currentFolderId: string | null;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isActive = currentFolderId === node.id;
  const href = `/projects/${projectId}/files?folder=${node.id}`;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-0.5"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded p-0.5 text-textSecondary hover:bg-surface-secondary"
            aria-label={expanded ? "Collapse folder" : "Expand folder"}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Link
          href={href}
          className={[
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition",
            isActive
              ? "bg-primary/10 font-medium text-primary"
              : "text-textPrimary hover:bg-surface-secondary",
          ].join(" ")}
        >
          <Folder className="h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
        </Link>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              projectId={projectId}
              node={child}
              currentFolderId={currentFolderId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  projectId,
  tree,
  currentFolderId,
}: FolderTreeProps) {
  const rootHref = `/projects/${projectId}/files`;
  const isRootActive = !currentFolderId;

  return (
    <div className="space-y-1">
      <Link
        href={rootHref}
        className={[
          "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition",
          isRootActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-textPrimary hover:bg-surface-secondary",
        ].join(" ")}
      >
        <Folder className="h-4 w-4 shrink-0" />
        <span>Root</span>
      </Link>
      {tree.map((node) => (
        <FolderTreeNode
          key={node.id}
          projectId={projectId}
          node={node}
          currentFolderId={currentFolderId}
          depth={0}
        />
      ))}
    </div>
  );
}
