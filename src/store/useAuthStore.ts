"use client";

import { create } from "zustand";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { auth, db } from "@/app/firebase";
import type { AppUser } from "@/types";

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: AppUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  logout: async () => {
    try {
      await signOut(auth);
    } finally {
      try {
        await fetch("/api/auth/session", { method: "DELETE" });
      } catch {
        // ignore cookie clear errors
      }
      set({ user: null, loading: false });
    }
  },
}));

let listenerInitialized = false;

if (typeof window !== "undefined" && !listenerInitialized) {
  listenerInitialized = true;

  onAuthStateChanged(auth, async (firebaseUser) => {
    const { setUser } = useAuthStore.getState();

    if (!firebaseUser) {
      setUser(null);
      useAuthStore.setState({ loading: false, initialized: true });
      return;
    }

    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));

      if (!snap.exists()) {
        setUser(null);
      } else {
        setUser(snap.data() as AppUser);
      }
    } catch {
      setUser(null);
    } finally {
      useAuthStore.setState({ loading: false, initialized: true });
    }
  });
}

