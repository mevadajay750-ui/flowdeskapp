"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import {
  dashboardNavItems,
  getActiveNavHref,
} from "@/components/layout/navItems";

export function MobileTabBar() {
  const pathname = usePathname();

  const activeHref = useMemo(() => getActiveNavHref(pathname), [pathname]);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-[var(--color-shadow)] backdrop-blur-md md:hidden"
    >
      <div className="flex h-16 items-stretch justify-around px-1">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;
          const label = item.mobileLabel ?? item.label;

          const link = (
            <Link
              href={item.href}
              className={[
                "flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors duration-200 motion-reduce:transition-none",
                isActive
                  ? "text-primary"
                  : "text-textSecondary active:text-textPrimary",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={[
                  "inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-primary/10" : "",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span
                className={[
                  "max-w-full truncate text-[10px] leading-tight",
                  isActive ? "font-semibold" : "font-medium",
                ].join(" ")}
              >
                {label}
              </span>
            </Link>
          );

          const tab = (
            <div key={item.href} className="flex min-w-0 flex-1">
              {link}
            </div>
          );

          if (!item.permission) {
            return tab;
          }

          return (
            <PermissionGuard
              key={item.href}
              permission={item.permission}
              fallback={null}
            >
              {tab}
            </PermissionGuard>
          );
        })}
      </div>
    </nav>
  );
}
