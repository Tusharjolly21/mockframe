import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

type FirebaseConfig = {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  storageBucket?: string;
};

export class FirebaseConfigError extends Error {
  constructor(message = "Firebase Admin is not configured") {
    super(message);
    this.name = "FirebaseConfigError";
  }
}

function readConfig(): FirebaseConfig {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  };
}

export function firebaseSetupHint(): string {
  return [
    "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and FIREBASE_STORAGE_BUCKET.",
    "Alternatively deploy on Google infrastructure with Application Default Credentials and set FIREBASE_STORAGE_BUCKET.",
  ].join(" ");
}

export function firebaseErrorPayload(err: unknown): { error: string; code?: string; message?: string } {
  const anyErr = err as { code?: unknown; message?: unknown };
  return {
    error: "Firebase request failed",
    code: typeof anyErr?.code === "string" ? anyErr.code : undefined,
    message: typeof anyErr?.message === "string" ? anyErr.message : "Unknown Firebase error",
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = readConfig();
  const hasServiceAccount = !!(cfg.projectId && cfg.clientEmail && cfg.privateKey);
  const hasAdc = !!(cfg.projectId && (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_USE_ADC === "1" || process.env.K_SERVICE));
  return hasServiceAccount || hasAdc;
}

export function firebaseApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const cfg = readConfig();
  if (!isFirebaseConfigured()) throw new FirebaseConfigError(firebaseSetupHint());

  const credential =
    cfg.clientEmail && cfg.privateKey
      ? cert({ projectId: cfg.projectId, clientEmail: cfg.clientEmail, privateKey: cfg.privateKey })
      : applicationDefault();

  return initializeApp({
    projectId: cfg.projectId,
    credential,
    storageBucket: cfg.storageBucket,
  });
}

export function firestoreDb(): Firestore {
  return getFirestore(firebaseApp());
}

export function firebaseStorage(): Storage {
  return getStorage(firebaseApp());
}

export function firebaseAuth() {
  return getAuth(firebaseApp());
}
