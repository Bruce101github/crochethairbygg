"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HiArrowLeft, HiShoppingBag, HiCheckCircle, HiClock, HiXCircle } from "react-icons/hi";
import toast from "react-hot-toast";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ReturnsPage() {
  const router = useRouter();
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    if (!accessToken) {
      router.push("/signin");
      return;
    }
    fetchReturns();
  }, [accessToken, router]);

  async function fetchReturns() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/return-requests/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Return requests response:", data);
        // Handle paginated response
        const requestsArray = Array.isArray(data) ? data : (data.results || []);
        console.log("Return requests array:", requestsArray);
        setReturnRequests(requestsArray);
      }
    } catch (error) {
      console.error("Error fetching return requests:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status) {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-blue-100 text-blue-800 border-blue-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      refunded: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  }

  function getStatusIcon(status) {
    const icons = {
      pending: <HiClock className="text-yellow-600" size={20} />,
      approved: <HiCheckCircle className="text-blue-600" size={20} />,
      rejected: <HiXCircle className="text-red-600" size={20} />,
      refunded: <HiCheckCircle className="text-green-600" size={20} />,
      cancelled: <HiXCircle className="text-gray-600" size={20} />,
    };
    return icons[status] || <HiClock className="text-gray-600" size={20} />;
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen px-5 lg:px-40 pb-20">
        <Breadcrumbs
          items={[
            { label: "Returns", href: "/returns" },
          ]}
        />
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Return Requests</h1>
          <Link
            href="/orders"
            className="text-[#FF6B9D] hover:text-[#FF5A8A] flex items-center gap-2"
          >
            <HiArrowLeft size={20} />
            Back to Orders
          </Link>
        </div>

        {returnRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <HiShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Return Requests
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't requested any returns yet.
            </p>
            <Link
              href="/orders"
              className="inline-block bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              View Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {returnRequests.map((returnReq) => (
              <div
                key={returnReq.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Return Request #{returnReq.id}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Order #{returnReq.order_id} • Requested on {formatDate(returnReq.requested_at)}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${getStatusColor(returnReq.status)}`}>
                    {getStatusIcon(returnReq.status)}
                    <span className="font-semibold capitalize">{returnReq.status.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reason</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">
                      {returnReq.reason.replace('_', ' ')}
                    </p>
                  </div>
                  {returnReq.order_item_details && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Item</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {returnReq.order_item_details.product_title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quantity: {returnReq.order_item_details.quantity}
                      </p>
                    </div>
                  )}
                  {returnReq.approved_refund_amount && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Refund Amount</p>
                      <p className="font-semibold text-green-600 text-lg">
                        ₵{parseFloat(returnReq.approved_refund_amount).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {returnReq.reason_description && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
                    <p className="text-gray-900 dark:text-white">{returnReq.reason_description}</p>
                  </div>
                )}

                {returnReq.refund_reference && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      <span className="font-semibold">Refund Processed:</span> Reference #{returnReq.refund_reference}
                    </p>
                    {returnReq.processed_at && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Processed on {formatDate(returnReq.processed_at)}
                      </p>
                    )}
                  </div>
                )}

                <Link
                  href={`/orders/${returnReq.order_id}`}
                  className="inline-block mt-4 text-[#FF6B9D] hover:text-[#FF5A8A] text-sm font-semibold"
                >
                  View Order Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
