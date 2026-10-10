"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  completeEmailLinkSignIn,
  ensureGuestSession,
  isFirebaseConfigured,
  onAuthChange,
  sendEmailSignInLink,
  signInWithGoogle,
  signInWithPassword,
  signOutToGuest,
  updateDisplayName,
} from "./firebaseClient";

export type Account = {
  uid: string;
  email: string | null;
  name: string | null;
  photo: string | null;
  /** ISO time the account was created, when Firebase reports it */
  createdAt: string | null;
  /** how they sign in: "google", "password" or "email-link" */
  providers: string[];
};

function providersOf(user: User): string[] {
  const ids = user.providerData.map((p) => p.providerId);
  return [...new Set(ids.map((id) => (id === "google.com" ? "google" : id === "password" ? "email" : id)))];
}

type AuthValue = {
  loading: boolean;
  configured: boolean;
  /** the signed-in real account, or null for an anonymous guest */
  account: Account | null;
  signInGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signInPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** rename the signed-in account */
  setName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Wraps the app with Firebase auth state. A user is always present — anonymous
 * (guest) by default — and `account` is non-null only once they upgrade to a real
 * Google/email session. Because server-side ownership is keyed on the uid and we
 * LINK the guest session on sign-in, all of a guest's work carries over.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    // finish an email magic-link if we landed on one, else make sure a guest exists
    completeEmailLinkSignIn()
      .catch(() => false)
      .then((handled) => {
        if (!handled) return ensureGuestSession();
      })
      .catch(() => {});
    const unsub = onAuthChange((user: User | null) => {
      setAccount(
        user && !user.isAnonymous
          ? {
              uid: user.uid,
              email: user.email,
              name: user.displayName,
              photo: user.photoURL,
              createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : null,
              providers: providersOf(user),
            }
          : null
      );
      setLoading(false);
    });
    return unsub;
  }, [configured]);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      configured,
      account,
      signInGoogle: async () => {
        await signInWithGoogle();
      },
      sendMagicLink: async (email: string) => {
        await sendEmailSignInLink(email);
      },
      signInPassword: async (email: string, password: string) => {
        await signInWithPassword(email, password);
      },
      signOut: async () => {
        await signOutToGuest();
      },
      setName: async (name: string) => {
        await updateDisplayName(name);
        const clean = name.trim().slice(0, 60) || null;
        setAccount((a) => (a ? { ...a, name: clean } : a));
      },
    }),
    [loading, configured, account]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
