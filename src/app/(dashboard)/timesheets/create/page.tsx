"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { db } from "@/app/firebase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Project, TimesheetStatus } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

const timesheetSchema = z.object({
  projectId: z.string().min(1, "Project is required."),
  date: z.string().min(1, "Date is required."),
  hours: z
    .number()
    .min(0.5, "Hours must be at least 0.5.")
    .max(24, "Hours cannot exceed 24 in a single day."),
  taskDescription: z
    .string()
    .min(1, "Task description is required.")
    .max(2000, "Task description is too long."),
});

type TimesheetFormValues = z.infer<typeof timesheetSchema>;

export default function CreateTimesheetPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TimesheetFormValues>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      hours: 8,
    },
  });

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return;

      setLoadingProjects(true);
      setError(null);

      try {
        const q = query(
          collection(db, "projects"),
          where("memberIds", "array-contains", user.uid)
        );
        const snapshot = await getDocs(q);

        const items: Project[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Project, "id">;
          items.push({
            id: docSnap.id,
            ...data,
          });
        });

        setProjects(items);
      } catch (err) {
        console.error(err);
        setError("Failed to load your projects. Please try again.");
      } finally {
        setLoadingProjects(false);
      }
    };

    if (user) {
      void loadProjects();
    }
  }, [user]);

  const onSubmit = async (values: TimesheetFormValues) => {
    setError(null);

    if (!user) {
      setError("You must be signed in to submit a timesheet.");
      return;
    }

    const selectedProject = projects.find((p) => p.id === values.projectId);

    if (!selectedProject) {
      setError("Selected project could not be found.");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "timesheets"), {
        userId: user.uid,
        userName: user.name,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        date: values.date,
        hours: values.hours,
        taskDescription: values.taskDescription,
        status: "pending" as TimesheetStatus,
        createdAt: serverTimestamp(),
      });

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Timesheet submitted successfully.");
      }

      router.push("/timesheets");
    } catch (err) {
      console.error(err);
      setError("Unable to submit timesheet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">
          Submit Timesheet
        </h1>
        <p className="mt-2 text-sm text-textSecondary">
          Log your hours for a project. You can edit your entry later as long
          as it remains pending approval.
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-textSecondary">
              Project
            </label>
            <select
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={loadingProjects || projects.length === 0}
              {...register("projectId")}
            >
              <option value="">
                {loadingProjects
                  ? "Loading your projects..."
                  : projects.length === 0
                  ? "You have no assigned projects"
                  : "Select a project"}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="text-xs text-error">
                {errors.projectId.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-error">{errors.date.message}</p>
              )}
            </div>

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
                {...register("hours", { valueAsNumber: true })}
              />
              <p className="text-xs text-textSecondary">
                Enter total hours worked for this date (minimum 0.5, maximum
                24).
              </p>
              {errors.hours && (
                <p className="text-xs text-error">{errors.hours.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-textSecondary">
              Task description
            </label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Describe what you worked on during this time."
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
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Timesheet"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

