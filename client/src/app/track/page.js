"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiShoppingBag, HiSearch, HiLocationMarker, HiCalendar, HiTruck, HiCheckCircle, HiClock, HiXCircle } from "react-icons/hi";
import { toast } from "react-hot-toast";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  async function handleTrack() {
    if (!orderId.trim()) {
      toast.error("Please enter an order ID");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/orders/${orderId}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        toast.success("Order found!");
      } else if (res.status === 404) {
        toast.error("Order not found. Please check your order ID.");
        setOrder(null);
      } else if (res.status === 401) {
        toast.error("Please sign in to track your orders");
        router.push("/signin");
      } else {
        toast.error("Failed to track order");
        setOrder(null);
      }
    } catch (error) {
      console.error("Error tracking order:", error);
      toast.error("Failed to track order");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status) {
    const icons = {
      pending: <HiClock className="text-yellow-600" size={24} />,
      paid: <HiCheckCircle className="text-blue-600" size={24} />,
      processing: <HiTruck className="text-purple-600" size={24} />,
      shipped: <HiTruck className="text-indigo-600" size={24} />,
      delivered: <HiCheckCircle className="text-green-600" size={24} />,
      cancelled: <HiXCircle className="text-red-600" size={24} />,
    };
    return icons[status] || <HiShoppingBag className="text-gray-600" size={24} />;
  }

  function getStatusColor(status) {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      paid: "bg-blue-100 text-blue-800 border-blue-300",
      processing: "bg-purple-100 text-purple-800 border-purple-300",
      shipped: "bg-indigo-100 text-indigo-800 border-indigo-300",
      delivered: "bg-green-100 text-green-800 border-green-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  }

  function getStatusSteps(status) {
    const steps = [
      { key: "pending", label: "Order Placed", completed: true },
      { key: "paid", label: "Payment Confirmed", completed: status !== "pending" },
      { key: "processing", label: "Processing", completed: ["processing", "shipped", "delivered"].includes(status) },
      { key: "shipped", label: "Shipped", completed: ["shipped", "delivered"].includes(status) },
      { key: "delivered", label: "Delivered", completed: status === "delivered" },
    ];

    if (status === "cancelled") {
      return [
        { key: "pending", label: "Order Placed", completed: true },
        { key: "cancelled", label: "Cancelled", completed: true, isCancelled: true },
      ];
    }

    return steps;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen px-5 lg:px-40 pb-20">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Track Order", href: "/track" },
          ]}
        />
        <h1 className="text-3xl font-bold mb-8 text-center">Track Your Order</h1>

        {/* Search Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-2">
                Order ID or Reference Number
              </label>
              <input
                id="orderId"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleTrack()}
                placeholder="Enter order ID (e.g., 123)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleTrack}
                disabled={loading}
                className="px-6 py-3 bg-[#FF6B9D] text-white rounded-lg font-semibold hover:bg-[#FF5A8A] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <HiSearch size={20} />
                {loading ? "Tracking..." : "Track Order"}
              </button>
            </div>
          </div>
          {!accessToken && (
            <p className="mt-3 text-sm text-gray-600">
              <button
                onClick={() => router.push("/signin")}
                className="text-[#FF6B9D] hover:underline"
              >
                Sign in
              </button>{" "}
              to track your orders automatically
            </p>
          )}
        </div>

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Status Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Order #{order.id}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Placed on {formatDate(order.created_at)}
                  </p>
                  {order.tracking_number && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-semibold">Tracking Number:</span> {order.tracking_number}
                    </p>
                  )}
                </div>
                <div className={`px-4 py-2 rounded-lg border ${getStatusColor(order.status)}`}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className="font-semibold">
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Order Status</h3>
                <div className="relative">
                  {getStatusSteps(order.status).map((step, index, array) => (
                    <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                            step.isCancelled
                              ? "bg-red-100 border-red-300"
                              : step.completed
                              ? "bg-[#FF6B9D] border-[#FF6B9D] text-white"
                              : "bg-gray-100 border-gray-300 text-gray-400"
                          }`}
                        >
                          {step.isCancelled ? (
                            <HiXCircle size={24} className="text-red-600" />
                          ) : step.completed ? (
                            <HiCheckCircle size={24} />
                          ) : (
                            <HiClock size={24} />
                          )}
                        </div>
                        {index < array.length - 1 && (
                          <div
                            className={`w-0.5 h-12 mt-2 ${
                              step.completed && !step.isCancelled
                                ? "bg-[#FF6B9D]"
                                : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <p
                          className={`font-semibold ${
                            step.completed ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </p>
                        {step.completed && !step.isCancelled && (
                          <p className="text-sm text-gray-600 mt-1">
                            {step.key === "pending" && formatDate(order.created_at)}
                            {step.key === "paid" && order.status !== "pending" && "Payment received"}
                            {step.key === "processing" && "Your order is being prepared"}
                            {step.key === "shipped" && "Order is on the way"}
                            {step.key === "delivered" && "Order has been delivered"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <HiShoppingBag size={24} />
                Order Items
              </h3>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 border border-gray-100 rounded-lg"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.variant?.product?.images?.[0] ? (
                        <img
                          src={item.variant.product.images[0].image}
                          alt={item.variant.product.title || "Product"}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <HiShoppingBag size={32} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">
                        {item.variant?.product?.title || "Product"}
                      </h4>
                      {item.variant && (
                        <p className="text-sm text-gray-600">
                          {item.variant.length && `Length: ${item.variant.length}`}
                          {item.variant.color && ` • Color: ${item.variant.color}`}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">GH₵{item.item_total}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-[#FF6B9D]">GH₵{order.total}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {order.address && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <HiLocationMarker size={24} />
                  Delivery Address
                </h3>
                <div className="text-gray-700">
                  <p className="font-semibold text-lg">{order.address.full_name}</p>
                  <p className="mt-2">{order.address.address_line}</p>
                  <p>
                    {order.address.city}, {order.address.region}
                  </p>
                  <p className="mt-2">
                    <span className="font-medium">Phone:</span> {order.address.phone_number}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => router.push(`/orders/${order.id}`)}
                className="flex-1 px-6 py-3 bg-[#FF6B9D] text-white rounded-lg font-semibold hover:bg-[#FF5A8A] transition"
              >
                View Full Order Details
              </button>
              <button
                onClick={() => router.push("/orders")}
                className="px-6 py-3 border-2 border-[#FF6B9D] text-[#FF6B9D] rounded-lg font-semibold hover:bg-[#FF6B9D]/10 transition"
              >
                All Orders
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!order && !loading && (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <HiShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">
              Enter an order ID above to track your order
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

