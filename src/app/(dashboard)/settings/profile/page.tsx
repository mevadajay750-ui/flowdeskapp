"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadResult,
} from "firebase/storage";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { db, storage } from "@/app/firebase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AppUser } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  contactNumber: z
    .string()
    .min(7, "Contact number must be at least 7 digits."),
  designation: z.string().min(2, "Designation is required."),
  skills: z.string(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileSettingsPage() {
  const { user, setUser } = useAuthStore();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setError(null);

      try {
        const refDoc = doc(db, "users", user.uid);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          setError("Profile not found.");
          setLoadingProfile(false);
          return;
        }

        const data = snap.data() as AppUser;

        setProfile(data);
        setPhotoPreview(data.photoURL ?? null);

        reset({
          name: data.name ?? "",
          contactNumber: data.contactNumber ?? "",
          designation: data.designation ?? "",
          skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    void load();
  }, [user, reset]);

  const initials = useMemo(() => {
    const nameSource = profile?.name ?? user?.name ?? "";
    if (!nameSource) return "";
    return nameSource
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [profile?.name, user?.name]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFileError("Please upload a valid image file.");
      setSelectedFile(null);
      return;
    }

    const maxSizeBytes = 3 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileError("Image must be smaller than 3MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setError(null);
    setFileError(null);

    if (!user) {
      setError("You must be signed in to update your profile.");
      return;
    }

    setSubmitting(true);

    try {
      const skillsArray = values.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let photoURL = profile?.photoURL ?? null;

      if (selectedFile) {
        const storageRef = ref(storage, `users/${user.uid}/profile-photo`);
        let uploadResult: UploadResult | undefined;

        uploadResult = await uploadBytes(storageRef, selectedFile);

        if (!uploadResult) {
          throw new Error("Unable to upload profile photo.");
        }

        photoURL = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "users", user.uid), {
        name: values.name,
        contactNumber: values.contactNumber,
        designation: values.designation,
        skills: skillsArray,
        photoURL: photoURL,
        updatedAt: serverTimestamp(),
      });

      if (setUser && user) {
        setUser({
          ...user,
          name: values.name,
          contactNumber: values.contactNumber,
          designation: values.designation,
          skills: skillsArray,
          photoURL: photoURL ?? undefined,
        });
      }

      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Profile updated successfully.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <div className="px-4 py-6 text-sm text-textSecondary">
          You need to be signed in to manage your profile.
        </div>
      </Card>
    );
  }

  if (loadingProfile) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <div className="px-4 py-6 text-sm text-textSecondary">
          Loading your profile...
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-linear-to-r from-primary via-accent to-primaryDark shadow-md">
        <div className="flex flex-col items-start gap-4 px-5 py-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile avatar"
                className="h-24 w-24 rounded-full border-2 border-white/80 object-cover shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/60 bg-primary/20 text-2xl font-semibold text-white shadow-md">
                {initials || user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-white">
            <h2 className="text-lg font-semibold">
              {profile?.name ?? user.name}
            </h2>
            <p className="text-sm opacity-90">
              {profile?.designation ?? user.designation}
            </p>
            <p className="mt-1 text-xs opacity-90">{user.email}</p>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl shadow-sm">
        <form className="space-y-5 p-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Name
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-error">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-textSecondary">
                Contact Number
              </label>
              <input
                type="tel"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                {...register("contactNumber")}
              />
              {errors.contactNumber && (
                <p className="text-xs text-error">
                  {errors.contactNumber.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-textSecondary">
              Designation
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              {...register("designation")}
            />
            {errors.designation && (
              <p className="text-xs text-error">
                {errors.designation.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-textSecondary">
              Skills
            </label>
            <input
              type="text"
              placeholder="e.g. React, TypeScript, Firebase"
              className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              {...register("skills")}
            />
            <p className="text-xs text-textSecondary">
              Comma separated skills (e.g. React, TypeScript, Firebase).
            </p>
            {errors.skills && (
              <p className="text-xs text-error">{errors.skills.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-textSecondary">
              Profile Photo
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={handlePhotoChange}
            />
            <p className="text-xs text-textSecondary">
              Upload a square image up to 3MB for best results.
            </p>
            {fileError && (
              <p className="text-xs text-error">{fileError}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

