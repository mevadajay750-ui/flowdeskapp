"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { auth, db, storage } from "@/app/firebase";
import type { AppUser } from "@/types";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  contactNumber: z
    .string()
    .min(7, "Contact number must be at least 7 digits."),
  designation: z.string().min(2, "Designation is required."),
  skills: z
    .string()
    .min(1, "Please enter at least one skill (comma separated)."),
  idProof: z
    .any()
    .refine(
      (files) => files && files.length === 1,
      "ID proof file is required."
    ),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormValues) => {
    setError(null);
    setSubmitting(true);

    try {
      const skillsArray = values.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const file: File | undefined = values.idProof?.[0];
      if (!file) {
        setError("ID proof file is required.");
        setSubmitting(false);
        return;
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const uid = credential.user.uid;

      const storageRef = ref(storage, `users/${uid}/id-proof`);
      await uploadBytes(storageRef, file);
      const idProofUrl = await getDownloadURL(storageRef);

      const userDoc: AppUser = {
        uid,
        name: values.name,
        email: values.email,
        contactNumber: values.contactNumber,
        designation: values.designation,
        skills: skillsArray,
        role: "freelancer",
        status: "pending",
        idProofUrl,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", uid), userDoc);

      // Basic toast-style feedback then redirect
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-alert
        window.alert("Account created. Awaiting admin approval.");
      }

      router.push("/login");
    } catch (err: unknown) {
      console.error(err);

      const errorCode =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: string }).code
          : undefined;

      if (errorCode === "auth/email-already-in-use") {
        setError(
          "An account with this email already exists. Redirecting to login..."
        );
        router.push("/login");
        return;
      }

      setError("Unable to create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-textPrimary">
        Create your account
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-textSecondary">
            Name
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-error">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-textSecondary">
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-error">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-textSecondary">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-error">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-textSecondary">
            Contact Number
          </label>
          <input
            type="tel"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("contactNumber")}
          />
          {errors.contactNumber && (
            <p className="text-xs text-error">
              {errors.contactNumber.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-textSecondary">
            Designation
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("designation")}
          />
          {errors.designation && (
            <p className="text-xs text-error">
              {errors.designation.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-textSecondary">
            Skills
          </label>
          <input
            type="text"
            placeholder="e.g. React, TypeScript, Firebase"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            {...register("skills")}
          />
          <p className="text-xs text-textSecondary">
            Comma separated skills (e.g. React, TypeScript, Firebase).
          </p>
          {errors.skills && (
            <p className="text-xs text-error">{errors.skills.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-textSecondary">
            ID Proof
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="w-full text-sm"
            {...register("idProof")}
          />
          {errors.idProof && (
            <p className="text-xs text-error">
              {errors.idProof.message as string}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}

