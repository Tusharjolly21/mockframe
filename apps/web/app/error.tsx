"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Route-level error boundary: a crash in one page shows a way back instead of a blank screen. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#09090b] px-6 text-center text-white">
      <h1 className="text-[24px] font-medium tracking-[-0.02em] sm:text-[30px]">Something went wrong.</h1>
      <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-zinc-400">
        This page hit an unexpected error. Your saved work is safe. Try again, or head back home.
      </p>
      <div className="mt-7 flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Try again
        </button>
        <Link href="/" className="text-[14px] font-medium text-zinc-400 transition-colors hover:text-white">
          Go home
        </Link>
      </div>
    </main>
  );
}
