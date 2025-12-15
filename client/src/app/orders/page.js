"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import Link from "next/link";
import { HiShoppingBag, HiCalendar, HiCurrencyDollar } from "react-icons/hi";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  const [refreshToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh");
    }
    return null;
  });

  // Token refresh function
  async function refreshAccessToken() {
    const currentRefreshToken = localStorage.getItem("refresh");
    if (!currentRefreshToken) return null;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: currentRefreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json();
      localStorage.setItem("access", data.access);
      setAccessToken(data.access);
      return data.access;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  async function fetchOrders() {
    try {
      let res = await fetch("http://127.0.0.1:8000/api/orders/history/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Handle 401 - token expired
      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Retry with new token
          res = await fetch("http://127.0.0.1:8000/api/orders/history/", {
            headers: {
              Authorization: `Bearer ${newToken}`,
            },
          });
        } else {
          console.error("Session expired. Please sign in again.");
          setOrders([]);
          setLoading(false);
          return;
        }
      }

      if (res.ok) {
        const data = await res.json();
        console.log("Orders API response:", data);
        // Ensure data is an array
        const ordersArray = Array.isArray(data) ? data : (data.results || []);
        console.log("Orders array:", ordersArray);
        setOrders(ordersArray);
      } else {
        const errorText = await res.text();
        console.error("Failed to fetch orders:", res.status, errorText);
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
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
      month: "short",
      day: "numeric",
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
            { label: "Orders", href: "/orders" },
          ]}
        />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <Link
            href="/returns"
            className="text-[#FF6B9D] hover:text-[#FF5A8A] font-semibold hover:underline"
          >
            View Returns
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <HiShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-4">No orders yet</p>
            <Link
              href="/products"
              className="text-[#FF6B9D] hover:underline font-semibold"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block border border-gray-200 rounded-md p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <HiCalendar size={16} />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-2">
                      <HiCurrencyDollar size={16} />
                      <span className="font-bold text-lg">GH₵{order.total}</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">
                    {order.items?.length || 0} item(s)
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

