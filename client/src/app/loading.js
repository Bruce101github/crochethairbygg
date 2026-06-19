export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white dark:bg-gray-900"
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#C8961F]/25 border-t-[#C8961F]"
      />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading…</p>
    </div>
  );
}
