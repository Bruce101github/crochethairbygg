"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HiShoppingCart, HiEye, HiShoppingBag, HiMenu, HiX, HiChevronDown } from "react-icons/hi";
import toast from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function AdminOrders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [editingTrackingId, setEditingTrackingId] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_access");
    }
    return null;
  });

  useEffect(() => {
    if (!accessToken) {
      router.push("/");
      return;
    }
    fetchOrders();
  }, [accessToken, router]);

  async function fetchOrders() {
    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/");
      
      if (res.ok) {
        const data = await res.json();
        console.log("Orders API response:", data);
        
        // Ensure data is an array
        const ordersArray = Array.isArray(data) ? data : (data.results || []);
        console.log("Orders array:", ordersArray);
        setOrders(ordersArray);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch orders:", res.status, errorData);
        toast.error(`Failed to load orders: ${errorData.detail || res.statusText}`);
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
      } else {
        toast.error("Error loading orders. Please check your connection.");
      }
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      const order = orders.find(o => o.id === orderId);
      const payload = { status: newStatus };
      
      // Include tracking number if it exists
      if (order?.tracking_number) {
        payload.tracking_number = order.tracking_number;
      }
      
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/status/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        // Merge the updated status with the existing order data to preserve all fields
        setOrders((prevOrders) => 
          prevOrders.map((order) => {
            if (order.id === orderId) {
              return {
                ...order,
                status: updatedOrder.status || newStatus,
              };
            }
            return order;
          })
        );
        toast.success("Order status updated successfully");
        setEditingStatusId(null);
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Error updating order status");
    }
  }

  async function updateTrackingNumber(orderId) {
    try {
      const order = orders.find(o => o.id === orderId);
      const payload = { 
        status: order?.status || "shipped",
        tracking_number: trackingNumber.trim() || null
      };
      
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/status/`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders((prevOrders) => 
          prevOrders.map((order) => {
            if (order.id === orderId) {
              return {
                ...order,
                tracking_number: updatedOrder.tracking_number || trackingNumber.trim(),
              };
            }
            return order;
          })
        );
        toast.success("Tracking number updated successfully");
        setEditingTrackingId(null);
        setTrackingNumber("");
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to update tracking number");
      }
    } catch (error) {
      console.error("Error updating tracking number:", error);
      toast.error("Error updating tracking number");
    }
  }

  function getStatusColor(status) {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      paid: "bg-blue-100 text-blue-800 border-blue-200",
      processing: "bg-purple-100 text-purple-800 border-purple-200",
      shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
      delivered: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function handleLogout() {
    localStorage.removeItem("admin_access");
    localStorage.removeItem("admin_refresh");
    router.push("/");
  }

  const statusOptions = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B9D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
      <div className="lg:pl-64">
        <AdminHeader setSidebarOpen={setSidebarOpen} />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
            <p className="text-gray-600">View and manage customer orders</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tracking Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order, index) => (
                    <tr key={order?.id || `order-${index}`} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">#{order.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.user || order.user_email || order.user_username || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(order.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">GH₵{order.total || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingStatusId === order.id ? (
                          <select
                            value={order.status || "pending"}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            onBlur={() => setEditingStatusId(null)}
                            className="text-xs font-semibold rounded-full border px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                            autoFocus
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer hover:opacity-80 transition ${getStatusColor(
                              order.status || "pending"
                            )}`}
                            onClick={() => setEditingStatusId(order.id)}
                            title="Click to change status"
                          >
                            {(order.status || "pending").charAt(0).toUpperCase() + (order.status || "pending").slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingTrackingId === order.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={trackingNumber}
                              onChange={(e) => setTrackingNumber(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  updateTrackingNumber(order.id);
                                }
                                if (e.key === "Escape") {
                                  setEditingTrackingId(null);
                                  setTrackingNumber("");
                                }
                              }}
                              placeholder="Enter tracking number"
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] w-32"
                              autoFocus
                            />
                            <button
                              onClick={() => updateTrackingNumber(order.id)}
                              className="text-green-600 hover:text-green-700 text-xs font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingTrackingId(null);
                                setTrackingNumber("");
                              }}
                              className="text-red-600 hover:text-red-700 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div
                            className="text-sm text-gray-600 cursor-pointer hover:text-[#FF6B9D] transition"
                            onClick={() => {
                              setEditingTrackingId(order.id);
                              setTrackingNumber(order.tracking_number || "");
                            }}
                            title="Click to edit tracking number"
                          >
                            {order.tracking_number || (
                              <span className="text-gray-400 italic">Click to add</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-[#FF6B9D] hover:text-[#FF5A8A] transition inline-flex items-center gap-1"
                          >
                            <HiEye size={18} />
                            <span>View</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-12">
                <HiShoppingCart size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No orders found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
