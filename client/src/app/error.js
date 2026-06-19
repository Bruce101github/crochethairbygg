"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center bg-white dark:bg-gray-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C8961F]/10">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#C8961F]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        </svg>
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          We hit an unexpected error loading this page. Please try again.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-[#C8961F] px-6 py-3 font-semibold text-[#231F20] transition hover:bg-[#A87814]"
      >
        Try again
      </button>
    </div>
  );
}
