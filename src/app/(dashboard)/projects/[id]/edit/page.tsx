"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { db } from "@/app/firebase";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Project, ProjectStatus } from "@/types";

const editProjectSchema = z.object({
  name: z.string().min(2, "Project name is required."),
  clientName: z.string().min(2, "Client name is required."),
  description: z.string().min(10, "Description should be at least 10 characters."),
  techStack: z
    .string()
    .min(1, "Please enter at least one technology (comma separated)."),
  status: z.custom<ProjectStatus>(),
  endDate: z.string().optional(),
});

type EditProjectFormValues = z.infer<typeof editProjectSchema>;

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params?.id;

  const [loadingProject, setLoadingProject] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema),
  });

  useEffect(() => {
    const load = async () => {
      if (!projectId) return;

      setLoadingProject(true);
      setError(null);

      try {
        const ref = doc(db, "projects", projectId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Project not found.");
          return;
        }

        const data = snap.data() as Project;

        reset({
          name: data.name,
          clientName: data.clientName,
          description: data.description,
          techStack: (data.techStack || []).join(", "),
          status: data.status,
          endDate: data.endDate ?? "",
        });
      } catch (err) {
        console.error(err);
        setError("Unable to load project.");
      } finally {
        setLoadingProject(false);
      }
    };

    void load();
  }, [projectId, reset]);

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: EditProjectFormValues) => {
    if (!projectId) return;

    setSubmitting(true);
    setError(null);

    try {
      const techStackArray = values.techStack
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const ref = doc(db, "projects", projectId);
      await updateDoc(ref, {
        name: values.name,
        clientName: values.clientName,
        description: values.description,
        techStack: techStackArray,
        status: values.status,
        endDate: values.endDate || null,
        updatedAt: serverTimestamp(),
      });

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Project updated successfully.");
      }

      router.push(`/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      setError("Unable to update project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="text-sm text-textSecondary">
        No project identifier provided.
      </div>
    );
  }

  return (
    <PermissionGuard
      permission="edit_project"
      fallback={
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">
            Edit Project
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            You do not have permission to edit projects.
          </p>
        </div>
      }
    >
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-textPrimary">
            Edit Project
          </h1>
          <p className="mt-2 text-sm text-textSecondary">
            Update core details, technology stack, and status for this project.
          </p>
        </div>

        <Card className="rounded-2xl shadow-sm">
          {loadingProject ? (
            <p className="text-sm text-textSecondary">Loading project...</p>
          ) : (
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
                    <p className="text-xs text-error">
                      {errors.name.message}
                    </p>
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
                    <p className="text-xs text-error">
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
                  <p className="text-xs text-error">
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
                  <p className="text-xs text-error">
                    {errors.techStack.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
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
                    <p className="text-xs text-error">
                      {errors.endDate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-textSecondary">
                    Status
                  </label>
                  <select
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    {...register("status")}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On hold</option>
                    <option value="archived">Archived</option>
                  </select>
                  {errors.status && (
                    <p className="text-xs text-error">
                      {errors.status as unknown as string}
                    </p>
                  )}
                </div>
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
                  onClick={() => router.push(`/projects/${projectId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </PermissionGuard>
  );
}

