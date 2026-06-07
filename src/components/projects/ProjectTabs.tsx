"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

interface ProjectTabsProps {
  projectId: string;
}

const tabs = [
  { key: "overview", label: "Overview", path: "" },
  { key: "team", label: "Team", path: "/team" },
  { key: "chat", label: "Chat", path: "/chat" },
  { key: "timesheets", label: "Timesheets", path: "/timesheets" },
];

export function ProjectTabs({ projectId }: ProjectTabsProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const canViewTeam =
    !!user && hasPermission(user.role, "manage_members");

  const basePath = `/projects/${projectId}`;

  const getHref = (path: string, key: string) => {
    if (key === "chat") {
      return `/chat/project/${projectId}`;
    }
    return path === "" ? basePath : `${basePath}${path}`;
  };

  const isActive = (path: string, key: string) => {
    const href = getHref(path, key);
    if (key === "overview") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  const visibleTabs = tabs.filter((tab) => {
    if (tab.key === "team" && !canViewTeam) {
      return false;
    }
    return true;
  });

  return (
    <div className="border-b border-border">
      <nav className="flex gap-4 text-sm">
        {visibleTabs.map((tab) => (
          <Link
            key={tab.key}
            href={getHref(tab.path, tab.key)}
            className={[
              "inline-flex items-center border-b-2 px-2.5 py-2 text-sm font-medium transition",
              isActive(tab.path, tab.key)
                ? "border-primary text-primary"
                : "border-transparent text-textSecondary hover:border-border hover:text-textPrimary",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

