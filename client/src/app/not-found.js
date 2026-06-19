import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center bg-white dark:bg-gray-900">
      <p className="brand-sheen text-6xl font-extrabold tracking-tight">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Page not found</h1>
        <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
          The page you’re looking for doesn’t exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-[#C8961F] px-6 py-3 font-semibold text-[#231F20] transition hover:bg-[#A87814]"
      >
        Back to home
      </Link>
    </div>
  );
}
