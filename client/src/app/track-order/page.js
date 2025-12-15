"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HiShoppingBag, HiTruck, HiCalendar, HiLocationMarker } from "react-icons/hi";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleTrack() {
    if (!orderId || !email) {
      toast.error("Please enter both order ID and email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/track/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: parseInt(orderId),
          email: email,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setOrder(data);
        toast.success("Order found!");
      } else {
        toast.error(data.error || "Order not found. Please check your order ID and email.");
        setOrder(null);
      }
    } catch (error) {
      console.error("Error tracking order:", error);
      toast.error("Error tracking order");
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status) {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-blue-100 text-blue-800",
      processing: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
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

  return (
    <div className="min-h-screen px-5 lg:px-40 pb-20">
      <Breadcrumbs
        items={[
          { label: "Track Order", href: "/track-order" },
        ]}
      />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Track Your Order</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Order ID *
              </label>
              <input
                type="number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter your order ID"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter the email used for this order"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
              />
            </div>
            <button
              onClick={handleTrack}
              disabled={loading || !orderId || !email}
              className="w-full bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Tracking..." : "Track Order"}
            </button>
          </div>
        </div>

        {order && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order #{order.id}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Placed on {formatDate(order.created_at)}
                </p>
              </div>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>

            {order.tracking_number && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <HiTruck size={20} className="text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Tracking Number</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-200">{order.tracking_number}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                      {item.variant?.product?.images?.[0] ? (
                        <img
                          src={item.variant.product.images[0].image}
                          alt={item.variant.product.title || "Product"}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <HiShoppingBag size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {item.variant?.product?.title || "Product"}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quantity: {item.quantity}
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white mt-1">₵{item.item_total}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {order.address && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <HiLocationMarker size={20} className="text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Address</h3>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-semibold text-gray-900 dark:text-white">{order.address.full_name}</p>
                  <p>{order.address.address_line}</p>
                  <p>
                    {order.address.city}, {order.address.region}
                  </p>
                  <p>{order.address.phone_number}</p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">₵{order.subtotal}</span>
                </div>
                {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-₵{parseFloat(order.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {order.shipping_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                    <span className="text-gray-900 dark:text-white">₵{parseFloat(order.shipping_cost || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-gray-900 dark:text-white">₵{order.total}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
