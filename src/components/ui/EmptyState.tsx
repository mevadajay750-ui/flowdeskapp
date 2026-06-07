"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
  className?: string;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onActionClick,
  className,
  icon,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center shadow-sm",
        className
      )}
    >
      {icon && <div className="mb-3 text-primary">{icon}</div>}
      <h3 className="text-sm font-semibold text-textPrimary">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-textSecondary">
        {description}
      </p>
      {actionLabel && onActionClick && (
        <div className="mt-4">
          <Button size="sm" onClick={onActionClick}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

