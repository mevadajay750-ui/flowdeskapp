"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsNav = [
  {
    label: "Profile",
    description: "Update your personal details and skills.",
    href: "/settings/profile",
  },
  {
    label: "Account",
    description: "View account information and security.",
    href: "/settings/account",
  },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Settings</h1>
        <p className="mt-1 text-sm text-textSecondary">
          Manage your profile, skills, and account preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px,1fr]">
        <aside className="rounded-2xl border border-border bg-surface p-3 shadow-sm">
          <nav className="space-y-1">
            {settingsNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex flex-col rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-primary/5 text-primary"
                      : "text-textSecondary hover:bg-surface-secondary hover:text-textPrimary",
                  ].join(" ")}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-textSecondary">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
}

