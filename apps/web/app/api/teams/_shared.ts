import { NextResponse } from "next/server";
import { firebaseErrorPayload, firebaseSetupHint, FirebaseConfigError } from "@/lib/server/firebaseAdmin";

export function teamError(err: unknown, where: string) {
  if (err instanceof FirebaseConfigError) {
    return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
  }
  if (err instanceof SyntaxError) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  console.error(`[teams ${where}]`, err);
  return NextResponse.json(firebaseErrorPayload(err), { status: 500 });
}

export const signInRequired = () => NextResponse.json({ error: "Sign in with your work account to use teams." }, { status: 401 });
export const notFound = () => NextResponse.json({ error: "Team not found, or you're not a member." }, { status: 404 });
export const forbidden = (msg: string) => NextResponse.json({ error: msg }, { status: 403 });
