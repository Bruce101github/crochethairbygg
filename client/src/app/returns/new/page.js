"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HiArrowLeft, HiShoppingBag } from "react-icons/hi";
import toast from "react-hot-toast";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function NewReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const itemId = searchParams.get("item");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    order: orderId ? parseInt(orderId) : null,
    order_item: itemId ? parseInt(itemId) : null,
    reason: "",
    reason_description: "",
    requested_refund_amount: "",
  });

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  const reasonOptions = [
    { value: "defective", label: "Defective/Damaged Item" },
    { value: "wrong_item", label: "Wrong Item Received" },
    { value: "not_as_described", label: "Not as Described" },
    { value: "changed_mind", label: "Changed My Mind" },
    { value: "size_issue", label: "Size/Color Issue" },
    { value: "quality_issue", label: "Quality Issue" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (!accessToken) {
      router.push("/signin");
      return;
    }

    if (!orderId) {
      toast.error("Order ID is required");
      router.push("/orders");
      return;
    }

    fetchOrder();
  }, [accessToken, orderId, router]);

  async function fetchOrder() {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        
        // Set default refund amount to item total if item is specified
        if (itemId && data.items) {
          const item = data.items.find(i => i.id === parseInt(itemId));
          if (item) {
            setFormData(prev => ({
              ...prev,
              requested_refund_amount: item.item_total.toString(),
            }));
          }
        } else {
          // Set to order total if full order return
          setFormData(prev => ({
            ...prev,
            requested_refund_amount: data.total.toString(),
          }));
        }

        // Check if order is eligible for return
        if (!['paid', 'processing', 'shipped', 'delivered'].includes(data.status)) {
          toast.error("This order is not eligible for return");
          router.push(`/orders/${orderId}`);
        }
      } else {
        toast.error("Failed to load order");
        router.push("/orders");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Error loading order");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        order: formData.order,
        order_item: formData.order_item || null,
        reason: formData.reason,
        reason_description: formData.reason_description,
        requested_refund_amount: formData.requested_refund_amount ? parseFloat(formData.requested_refund_amount) : null,
      };

      console.log("Submitting return request payload:", payload);

      const res = await fetch("http://127.0.0.1:8000/api/return-requests/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        console.log("Return request created:", data);
        toast.success("Return request submitted successfully!");
        router.push("/returns");
      } else {
        console.error("Return request error:", data);
        // Handle different error formats
        let errorMessage = "Failed to submit return request";
        
        if (data.non_field_errors && data.non_field_errors.length > 0) {
          errorMessage = data.non_field_errors[0];
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.reason) {
          errorMessage = typeof data.reason === 'string' ? data.reason : data.reason[0];
        } else if (data.order) {
          errorMessage = Array.isArray(data.order) ? data.order[0] : data.order;
        } else if (data.order_item) {
          errorMessage = Array.isArray(data.order_item) ? data.order_item[0] : data.order_item;
        } else if (data.reason_description) {
          errorMessage = Array.isArray(data.reason_description) ? data.reason_description[0] : data.reason_description;
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error submitting return request:", error);
      toast.error("Error submitting return request");
    } finally {
      setSubmitting(false);
    }
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

  if (!order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <p>Order not found</p>
        </div>
      </ProtectedRoute>
    );
  }

  const selectedItem = itemId && order.items 
    ? order.items.find(i => i.id === parseInt(itemId))
    : null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen px-5 lg:px-40 pb-20">
        <Breadcrumbs
          items={[
            { label: "Orders", href: "/orders" },
            { label: `Order #${order.id}`, href: `/orders/${order.id}` },
            { label: "Request Return", href: null },
          ]}
        />
        <div className="mb-6">
          <Link
            href={`/orders/${order.id}`}
            className="text-[#FF6B9D] hover:text-[#FF5A8A] flex items-center gap-2 mb-4"
          >
            <HiArrowLeft size={20} />
            Back to Order
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request Return</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Order #{order.id} • {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          {selectedItem ? (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Returning Item:</h3>
              <p className="text-gray-900 dark:text-white">{selectedItem.variant?.product?.title || "Product"}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Quantity: {selectedItem.quantity} • Price: ₵{selectedItem.item_total}
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Returning Full Order</h3>
              <p className="text-gray-600 dark:text-gray-400">Total: ₵{order.total}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Return *
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
              >
                <option value="">Select a reason</option>
                {reasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Details *
              </label>
              <textarea
                value={formData.reason_description}
                onChange={(e) => setFormData({ ...formData, reason_description: e.target.value })}
                required
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                placeholder="Please provide additional details about why you're returning this item..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Requested Refund Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₵</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.requested_refund_amount}
                  onChange={(e) => setFormData({ ...formData, requested_refund_amount: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-8 pr-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This is a request. The actual refund amount will be determined by the admin.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Return Request"}
              </button>
              <Link
                href={`/orders/${order.id}`}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
