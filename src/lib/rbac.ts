import type { UserRole } from "@/types";

export type Role = UserRole;

const rolePermissions: Record<Role, string[]> = {
  admin: [
    "view_dashboard",
    "manage_members",
    "create_project",
    "edit_project",
    "approve_timesheet",
    "view_all_projects",
  ],
  employee: ["view_dashboard", "view_assigned_projects", "submit_timesheet"],
  freelancer: ["view_dashboard", "view_assigned_projects", "submit_timesheet"],
};

export function hasPermission(role: Role, permission: string): boolean {
  const permissions = rolePermissions[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

