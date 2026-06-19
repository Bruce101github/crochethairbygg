export default function ProductsLoading() {
  return (
    <div role="status" aria-live="polite" className="bg-white px-3 py-8 dark:bg-gray-900 lg:px-40">
      <span className="sr-only">Loading products…</span>
      <div className="mb-6 h-7 w-44 animate-pulse rounded-md bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
