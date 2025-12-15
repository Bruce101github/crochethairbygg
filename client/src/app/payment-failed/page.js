"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { HiXCircle, HiArrowLeft, HiHome } from "react-icons/hi";

export default function PaymentFailedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <HiXCircle size={80} className="text-red-500 mx-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          We couldn't process your payment. Please try again or contact support
          if the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 bg-[#FF6B9D] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#FF5A8A]"
          >
            <HiArrowLeft size={20} />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 border border-gray-300 px-6 py-3 rounded-md font-semibold hover:bg-gray-50"
          >
            <HiHome size={20} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

