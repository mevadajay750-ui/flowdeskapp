"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface TopbarProps {
  title: string;
  actions?: ReactNode;
}

export function Topbar({ title, actions }: TopbarProps) {
  const { user, logout } = useAuthStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-2">
        <h1 className="truncate text-lg font-semibold text-textPrimary">
          {title}
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-4">
        {actions}

        <ThemeToggle />

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <div className="font-medium text-textPrimary">{user.name}</div>
              <div className="text-[11px] text-textSecondary">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-textSecondary shadow-sm hover:bg-surface-secondary"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
              className="hidden sm:inline-flex"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
