"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { HiShoppingBag, HiCalendar, HiLocationMarker, HiTruck } from "react-icons/hi";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    if (params.id && accessToken) {
      fetchOrder();
    }
  }, [params.id, accessToken]);

  async function fetchOrder() {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/orders/${params.id}/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Order data:", data);
        console.log("Order status:", data.status);
        setOrder(data);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
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

  if (!order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <p>Order not found</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen px-5 lg:px-40 pb-20">
        <Breadcrumbs
          items={[
            { label: "Orders", href: "/orders" },
            { label: `Order #${order?.id || params.id}`, href: null },
          ]}
        />
        <h1 className="text-2xl font-bold mb-6">Order Details</h1>

        <div className="grid lg:grid-cols-[65%_35%] gap-8">
          {/* Order Items */}
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <HiShoppingBag size={20} />
                <h2 className="text-xl font-semibold">Order Items</h2>
              </div>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b border-gray-200 last:border-0"
                  >
                    <div className="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center">
                      {item.variant?.product?.images?.[0] ? (
                        <Image
                          src={item.variant.product.images[0].image}
                          alt={item.variant.product.title || "Product"}
                          width={96}
                          height={96}
                          className="object-cover rounded-md"
                          unoptimized
                        />
                      ) : (
                        <HiShoppingBag size={32} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">
                        {item.variant?.product?.title || "Product"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity}
                      </p>
                      <p className="font-bold mt-2">₵{item.item_total}</p>
                      {order.status && ['paid', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                        <Link
                          href={`/returns/new?order=${order.id}&item=${item.id}`}
                          className="inline-block mt-2 text-sm text-[#FF6B9D] hover:text-[#FF5A8A] hover:underline"
                        >
                          Request Return for this item
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-md p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Order ID</span>
                  <span className="font-semibold">#{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiCalendar size={16} />
                  <span>{formatDate(order.created_at)}</span>
                </div>
                {order.tracking_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <HiTruck size={16} className="text-gray-600" />
                    <div>
                      <span className="text-gray-600">Tracking Number:</span>
                      <span className="font-semibold ml-2">{order.tracking_number}</span>
                    </div>
                  </div>
                )}
                {order.discount_code && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount ({order.discount_code})</span>
                    <span className="text-green-600">-₵{parseFloat(order.discount_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>₵{order.total}</span>
                  </div>
                </div>
                {/* Return Request Button */}
                {order.status && ['paid', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      href={`/returns/new?order=${order.id}`}
                      className="block w-full text-center bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white font-semibold py-3 px-4 rounded-lg transition"
                    >
                      Request Return
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {order.address && (
              <div className="border border-gray-200 rounded-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <HiLocationMarker size={20} />
                  <h2 className="text-xl font-semibold">Delivery Address</h2>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{order.address.full_name}</p>
                  <p className="text-gray-600">{order.address.address_line}</p>
                  <p className="text-gray-600">
                    {order.address.city}, {order.address.region}
                  </p>
                  <p className="text-gray-600">{order.address.phone_number}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

