import type { ComponentType } from "react";
import {
  Clock,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  mobileLabel?: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: string;
}

export const dashboardNavItems: NavItem[] = [
  {
    label: "Dashboard",
    mobileLabel: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Chats",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    label: "Timesheets",
    mobileLabel: "Time",
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

export function getActiveNavHref(pathname: string | null): string {
  if (!pathname) return "";
  const match = dashboardNavItems.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.href ?? "";
}
