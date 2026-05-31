type AuthErrorLike = {
  code?: string;
  message?: string;
};

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as AuthErrorLike).code === "string"
      ? (error as AuthErrorLike).code
      : undefined;

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. If you have not signed up on this app yet, create an account first.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact an administrator.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/invalid-api-key":
    case "auth/app-not-authorized":
      return "Firebase is misconfigured. Check NEXT_PUBLIC_FIREBASE_* in .env.local and restart the dev server.";
    default:
      if (process.env.NODE_ENV === "development" && code) {
        return `Sign-in failed (${code}). Check the browser console for details.`;
      }
      return "Unable to sign in. Please try again.";
  }
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True when Firebase client config is present (client bundle only). */
export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}
