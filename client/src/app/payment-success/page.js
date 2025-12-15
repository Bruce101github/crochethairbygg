"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HiCheckCircle, HiShoppingBag, HiHome } from "react-icons/hi";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (reference) {
      if (reference.startsWith("order_")) {
        const id = reference.split("_")[1];
        setOrderId(id);
      } else {
        // Try to extract order ID from reference if it's just a number
        setOrderId(reference);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <HiCheckCircle size={80} className="text-green-500 mx-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your order has been confirmed and will be
          processed shortly.
        </p>
        {orderId && (
          <div className="bg-gray-50 rounded-md p-4 mb-6">
            <p className="text-sm text-gray-600">Order ID</p>
            <p className="font-semibold">#{orderId}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/orders"
            className="flex items-center justify-center gap-2 bg-[#FF6B9D] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#FF5A8A]"
          >
            <HiShoppingBag size={20} />
            View Orders
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 border border-gray-300 px-6 py-3 rounded-md font-semibold hover:bg-gray-50"
          >
            <HiHome size={20} />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

