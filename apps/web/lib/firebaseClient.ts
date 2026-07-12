"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let authPromise: Promise<Auth | null> | null = null;

function hasClientConfig(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

/** True when the public Firebase web config is present (so real sign-in can work). */
export function isFirebaseConfigured(): boolean {
  return hasClientConfig();
}

const EMAIL_LINK_KEY = "mf:emailForSignIn";

/** Subscribe to auth changes; fires with the current user (anonymous OR real) or null. */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

/** Ensure there is at least an anonymous (guest) session. */
export async function ensureGuestSession(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth && !auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch {
      /* anonymous provider may be disabled — the guest cookie still covers the API */
    }
  }
}

/**
 * Sign in with Google. When the user is currently an anonymous guest we LINK the
 * Google account onto that same session, so the uid is preserved and every draft
 * / asset they already made (all scoped by uid on the server) carries over. If
 * that Google account already exists elsewhere we fall back to a plain sign-in.
 */
export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Sign-in isn't configured.");
  const provider = new GoogleAuthProvider();
  const current = auth.currentUser;
  try {
    const res =
      current && current.isAnonymous ? await linkWithPopup(current, provider) : await signInWithPopup(auth, provider);
    return res.user;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
      const cred = GoogleAuthProvider.credentialFromError(e as never);
      const res = cred ? await signInWithCredential(auth, cred) : await signInWithPopup(auth, provider);
      return res.user;
    }
    throw e;
  }
}

/** Send a passwordless magic-link to `email`; completing it returns to /editor. */
export async function sendEmailSignInLink(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Sign-in isn't configured.");
  await sendSignInLinkToEmail(auth, email, { url: `${window.location.origin}/editor?fkauth=1`, handleCodeInApp: true });
  window.localStorage.setItem(EMAIL_LINK_KEY, email);
}

/** If the current URL is a completed email magic-link, finish sign-in (linking to
 *  the anonymous guest when possible). Returns true when it handled a link. */
export async function completeEmailLinkSignIn(): Promise<boolean> {
  const auth = getFirebaseAuth();
  if (!auth || typeof window === "undefined" || !isSignInWithEmailLink(auth, window.location.href)) return false;
  let email = window.localStorage.getItem(EMAIL_LINK_KEY);
  if (!email) email = window.prompt("Confirm your email to finish signing in") ?? "";
  if (!email) return false;
  const current = auth.currentUser;
  try {
    if (current && current.isAnonymous) {
      await linkWithCredential(current, EmailAuthProvider.credentialWithLink(email, window.location.href));
    } else {
      await signInWithEmailLink(auth, email, window.location.href);
    }
  } catch (e) {
    if ((e as { code?: string }).code === "auth/credential-already-in-use") {
      await signInWithEmailLink(auth, email, window.location.href);
    } else {
      throw e;
    }
  }
  window.localStorage.removeItem(EMAIL_LINK_KEY);
  window.history.replaceState({}, "", window.location.origin + window.location.pathname);
  return true;
}

/** Sign out of the real account and drop back to a fresh anonymous guest session. */
export async function signOutToGuest(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
  await ensureGuestSession();
}

/** Returns an anonymous Firebase Auth session when the public web config exists.
 * API routes still support the guest cookie when Auth is not enabled/configured. */
export function getFirebaseAuth(): Auth | null {
  if (!hasClientConfig()) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export async function getFirebaseIdToken(): Promise<string | null> {
  if (!hasClientConfig()) return null;
  if (!authPromise) {
    authPromise = (async () => {
      const auth = getFirebaseAuth();
      if (!auth) return null;
      if (!auth.currentUser) await signInAnonymously(auth);
      return auth;
    })().catch(() => null);
  }
  const auth = await authPromise;
  return auth?.currentUser ? auth.currentUser.getIdToken() : null;
}

export async function firebaseFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getFirebaseIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
