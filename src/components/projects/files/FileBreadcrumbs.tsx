"use client";

import Link from "next/link";

import type { ProjectFileItem } from "@/types";

interface FileBreadcrumbsProps {
  projectId: string;
  path: ProjectFileItem[];
}

export function FileBreadcrumbs({ projectId, path }: FileBreadcrumbsProps) {
  const baseHref = `/projects/${projectId}/files`;

  return (
    <nav className="flex flex-wrap items-center gap-1 text-xs text-textSecondary">
      <Link
        href={baseHref}
        className="font-medium text-primary hover:text-primaryDark"
      >
        Root
      </Link>
      {path.map((folder, index) => {
        const isLast = index === path.length - 1;
        const href = `${baseHref}?folder=${folder.id}`;

        return (
          <span key={folder.id} className="flex items-center gap-1">
            <span>/</span>
            {isLast ? (
              <span className="font-medium text-textPrimary">{folder.name}</span>
            ) : (
              <Link
                href={href}
                className="font-medium text-primary hover:text-primaryDark"
              >
                {folder.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
