"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { db } from "@/app/firebase";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ProjectStatus } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

const projectSchema = z.object({
  name: z.string().min(2, "Project name is required."),
  clientName: z.string().min(2, "Client name is required."),
  description: z.string().min(10, "Description should be at least 10 characters."), // basic sanity
  techStack: z
    .string()
    .min(1, "Please enter at least one technology (comma separated)."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional(),
  status: z.custom<ProjectStatus>(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export default function CreateProjectPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: "active" as ProjectStatus,
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    setError(null);

    if (!user) {
      setError("You must be signed in to create a project.");
      return;
    }

    setSubmitting(true);

    try {
      const techStackArray = values.techStack
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const creatorMember = {
        uid: user.uid,
        projectRole: "Owner",
        assignedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "projects"), {
        name: values.name,
        clientName: values.clientName,
        description: values.description,
        techStack: techStackArray,
        startDate: values.startDate,
        endDate: values.endDate || null,
        status: values.status ?? "active",
        createdBy: user.uid,
        members: [creatorMember],
        memberIds: [user.uid],
        createdAt: serverTimestamp(),
      });

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Project created successfully.");
      }

      router.push("/projects");
    } catch (err) {
      console.error(err);
      setError("Unable to create project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGuard
      permission="create_project"
      fallback={
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">
            Create Project
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            You do not have permission to create projects.
          </p>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">
            Create Project
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            Define a new project for your team, including client details,
            technology stack, and timeline.
          </p>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-textSecondary">
                  Project Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-textSecondary">
                  Client Name
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("clientName")}
                />
                {errors.clientName && (
                  <p className="text-xs text-red-600">
                    {errors.clientName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Description
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Tech Stack
              </label>
              <input
                type="text"
                placeholder="e.g. React, TypeScript, Firebase"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("techStack")}
              />
              <p className="text-xs text-textSecondary">
                Comma separated list of technologies (e.g. React, TypeScript,
                Firebase).
              </p>
              {errors.techStack && (
                <p className="text-xs text-red-600">
                  {errors.techStack.message}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-textSecondary">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("startDate")}
                />
                {errors.startDate && (
                  <p className="text-xs text-red-600">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-textSecondary">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("endDate")}
                />
                {errors.endDate && (
                  <p className="text-xs text-red-600">
                    {errors.endDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-textSecondary">
                  Status
                </label>
                <select
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("status")}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On hold</option>
                  <option value="archived">Archived</option>
                </select>
                {errors.status && (
                  <p className="text-xs text-red-600">
                    {errors.status as unknown as string}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.push("/projects")}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PermissionGuard>
  );
}

