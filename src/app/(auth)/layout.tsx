import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-textPrimary">Flowdesk</h1>
          <p className="mt-1 text-sm text-textSecondary">
            Sign in to manage projects and timesheets.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

