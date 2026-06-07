"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { db } from "@/app/firebase";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Timesheet } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

const editSchema = z.object({
  hours: z
    .number()
    .min(0.5, "Hours must be at least 0.5.")
    .max(24, "Hours cannot exceed 24 in a single day."),
  taskDescription: z
    .string()
    .min(1, "Task description is required.")
    .max(2000, "Task description is too long."),
});

type EditFormValues = z.infer<typeof editSchema>;

export default function EditTimesheetPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const timesheetId = params?.id;

  const { user } = useAuthStore();

  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    const load = async () => {
      if (!timesheetId || !user) return;

      setLoading(true);
      setError(null);

      try {
        const ref = doc(db, "timesheets", timesheetId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Timesheet not found.");
          setLoading(false);
          return;
        }

        const data = snap.data() as Omit<Timesheet, "id">;
        const ts: Timesheet = {
          id: snap.id,
          ...data,
        };

        if (user.role !== "admin" && ts.userId !== user.uid) {
          setError("You are not allowed to edit this timesheet.");
          setLoading(false);
          return;
        }

        setTimesheet(ts);

        reset({
          hours: ts.hours,
          taskDescription: ts.taskDescription,
        });

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load timesheet.");
        setLoading(false);
      }
    };

    if (user && timesheetId) {
      void load();
    }
  }, [timesheetId, user, reset]);

  const onSubmit = async (values: EditFormValues) => {
    if (!timesheet) return;

    if (timesheet.status !== "pending") {
      setError("Only pending timesheets can be edited.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await updateDoc(doc(db, "timesheets", timesheet.id), {
        hours: values.hours,
        taskDescription: values.taskDescription,
        updatedAt: serverTimestamp(),
      });

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Timesheet updated successfully.");
      }

      router.push("/timesheets");
    } catch (err) {
      console.error(err);
      setError("Unable to update timesheet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-sm text-textSecondary">Loading timesheet...</div>
    );
  }

  if (error && !timesheet) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <div className="px-4 py-6 text-sm text-error">{error}</div>
      </Card>
    );
  }

  if (!timesheet) {
    return null;
  }

  const isPending = timesheet.status === "pending";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">
          Edit Timesheet
        </h1>
        <p className="mt-2 text-sm text-textSecondary">
          {isPending
            ? "Update the logged hours or description for this timesheet."
            : "This timesheet is no longer pending and cannot be edited."}
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {!isPending && (
            <Alert variant="warning">
              This timesheet has been {timesheet.status}. Only pending
              timesheets can be edited.
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Project
              </label>
              <input
                type="text"
                value={timesheet.projectName}
                disabled
                className="w-full rounded-xl border border-border bg-surface-secondary px-3 py-2 text-sm text-textSecondary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Date
              </label>
              <input
                type="text"
                value={
                  timesheet.date
                    ? new Date(timesheet.date).toLocaleDateString()
                    : ""
                }
                disabled
                className="w-full rounded-xl border border-border bg-surface-secondary px-3 py-2 text-sm text-textSecondary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Hours
              </label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                max={24}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={!isPending}
                {...register("hours", { valueAsNumber: true })}
              />
              {errors.hours && (
                <p className="text-xs text-error">{errors.hours.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Status
              </label>
              <input
                type="text"
                value={timesheet.status}
                disabled
                className="w-full rounded-xl border border-border bg-surface-secondary px-3 py-2 text-sm text-textSecondary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-textSecondary">
              Task description
            </label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={!isPending}
              {...register("taskDescription")}
            />
            {errors.taskDescription && (
              <p className="text-xs text-error">
                {errors.taskDescription.message}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/timesheets")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !isPending}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

