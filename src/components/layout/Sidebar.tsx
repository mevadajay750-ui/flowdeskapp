"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { PermissionGuard } from "@/components/auth/PermissionGuard";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Timesheets",
    href: "/timesheets",
    icon: Clock,
  },
  {
    label: "Members",
    href: "/members",
    icon: Users,
    permission: "manage_members",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const activeHref = useMemo(() => {
    if (!pathname) return "";
    const match = navItems.find((item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    );
    return match?.href ?? "";
  }, [pathname]);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-white/95 px-3 py-4 shadow-sm backdrop-blur md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
          F
        </div>
        <span className="text-sm font-semibold tracking-tight text-textPrimary">
          Flowdesk
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                activeHref === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-textSecondary hover:bg-slate-100 hover:text-textPrimary",
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

