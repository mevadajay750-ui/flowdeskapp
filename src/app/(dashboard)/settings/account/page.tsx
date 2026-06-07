"use client";

import { useMemo, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";

import { auth } from "@/app/firebase";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/useAuthStore";

function formatDate(value: unknown) {
  if (!value) return "—";

  try {
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate?: () => Date }).toDate === "function"
    ) {
      return (value as { toDate: () => Date }).toDate().toLocaleDateString();
    }

    if (typeof value === "string" || typeof value === "number") {
      return new Date(value).toLocaleDateString();
    }
  } catch {
    // ignore parse errors
  }

  return "—";
}

export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const joinedDate = useMemo(
    () => formatDate(user?.createdAt),
    [user?.createdAt]
  );

  if (!user) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <div className="px-4 py-6 text-sm text-textSecondary">
          You need to be signed in to view account details.
        </div>
      </Card>
    );
  }

  const handleChangePassword = async () => {
    setError(null);
    setSuccess(null);

    try {
      setSending(true);
      await sendPasswordResetEmail(auth, user.email);

      const message =
        "Password reset email sent. Please check your inbox.";
      setSuccess(message);

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert(message);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to send password reset email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-textPrimary">
          Account details
        </h2>
        <p className="mt-1 text-sm text-textSecondary">
          Your account identity and access information. Role and status are
          managed by administrators and cannot be changed here.
        </p>

        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-textSecondary">
              Email
            </dt>
            <dd className="text-sm text-textPrimary break-all">{user.email}</dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-textSecondary">
              Role
            </dt>
            <dd className="text-sm text-textPrimary">{user.role}</dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-textSecondary">
              Status
            </dt>
            <dd className="text-sm text-textPrimary">{user.status}</dd>
          </div>

          <div className="space-y-0.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-textSecondary">
              Joined
            </dt>
            <dd className="text-sm text-textPrimary">{joinedDate}</dd>
          </div>
        </dl>
      </Card>

      <Card className="rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-semibold text-textPrimary">
              Change password
            </h2>
            <p className="mt-1 text-sm text-textSecondary">
              We&apos;ll send a password reset link to your email address.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleChangePassword}
            disabled={sending}
          >
            {sending ? "Sending..." : "Change Password"}
          </Button>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
            {error}
          </div>
        )}

        {success && (
          <Alert variant="success">{success}</Alert>
        )}
      </Card>
    </div>
  );
}

