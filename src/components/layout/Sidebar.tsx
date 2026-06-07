"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  dashboardNavItems,
  getActiveNavHref,
} from "@/components/layout/navItems";
import { Logo } from "@/components/ui/Logo";

export function Sidebar() {
  const pathname = usePathname();

  const activeHref = useMemo(() => getActiveNavHref(pathname), [pathname]);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-surface-secondary/80 px-3 py-4 shadow-sm backdrop-blur md:flex">
      <div className="mb-4 px-2">
        <Logo />
      </div>

      <div className="mb-4 h-px w-full bg-linear-to-r from-transparent via-border to-transparent" />

      <nav className="flex-1 space-y-1.5">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-200 motion-reduce:transition-none",
                activeHref === item.href
                  ? "relative border-l-4 border-l-primary bg-primary/5 font-semibold text-primary"
                  : "text-textSecondary hover:bg-surface-secondary hover:text-textPrimary",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );

          if (!item.permission) {
            return content;
          }

          return (
            <PermissionGuard
              key={item.href}
              permission={item.permission}
              fallback={null}
            >
              {content}
            </PermissionGuard>
          );
        })}
      </nav>
    </aside>
  );
}
