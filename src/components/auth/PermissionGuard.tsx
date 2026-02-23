"use client";

import type { ReactNode } from "react";

import { hasPermission } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { user, loading, initialized } = useAuthStore();

  if (loading || !initialized || !user) {
    return <>{fallback}</>;
  }

  const allowed = hasPermission(user.role, permission);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

