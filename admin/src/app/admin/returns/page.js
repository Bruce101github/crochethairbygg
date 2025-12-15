"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HiShoppingBag, HiEye, HiMenu, HiX, HiCheckCircle, HiXCircle, HiClock, HiCurrencyDollar } from "react-icons/hi";
import toast from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function AdminReturns() {
  const router = useRouter();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [processingRefundId, setProcessingRefundId] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "",
    approved_refund_amount: "",
    admin_notes: "",
  });

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
    fetchReturns();
  }, [accessToken, router]);

  async function fetchReturns() {
    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/return-requests/`);
      if (res.ok) {
        const data = await res.json();
        console.log("Admin return requests response:", data);
        // Handle paginated response
        const requestsArray = Array.isArray(data) ? data : (data.results || []);
        console.log("Admin return requests array:", requestsArray);
        setReturns(requestsArray);
      }
    } catch (error) {
      console.error("Error fetching return requests:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateReturnRequest(id) {
    try {
      // Only send fields that have values
      const updateData = {};
      if (editForm.status) updateData.status = editForm.status;
      if (editForm.approved_refund_amount !== "" && editForm.approved_refund_amount !== null) {
        updateData.approved_refund_amount = parseFloat(editForm.approved_refund_amount) || null;
      }
      if (editForm.admin_notes !== undefined) updateData.admin_notes = editForm.admin_notes;

      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/return-requests/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updated = await res.json();
        setReturns(returns.map(r => r.id === id ? updated : r));
        toast.success("Return request updated successfully");
        setEditingId(null);
        setEditForm({ status: "", approved_refund_amount: "", admin_notes: "" });
        // Refresh the list to get latest data
        await fetchReturns();
      } else {
        const errorData = await res.json();
        const errorMsg = errorData.detail || errorData.error || errorData.non_field_errors?.[0] || "Failed to update return request";
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error updating return request:", error);
      toast.error("Error updating return request: " + (error.message || "Unknown error"));
    }
  }

  async function processRefund(id) {
    if (!confirm("Are you sure you want to process the refund? This action cannot be undone.")) {
      return;
    }

    setProcessingRefundId(id);
    try {
      const res = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/return-requests/${id}/process-refund/`,
        {
          method: "POST",
        }
      );

      if (res.ok) {
        const data = await res.json();
        toast.success(`Refund processed successfully! Reference: ${data.refund_reference}`);
        await fetchReturns(); // Refresh to get updated status
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to process refund");
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error("Error processing refund");
    } finally {
      setProcessingRefundId(null);
    }
  }

  function handleEdit(returnReq) {
    setEditingId(returnReq.id);
    setEditForm({
      status: returnReq.status,
      approved_refund_amount: returnReq.approved_refund_amount || returnReq.requested_refund_amount || "",
      admin_notes: returnReq.admin_notes || "",
    });
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
      pending: <HiClock className="text-yellow-600" size={18} />,
      approved: <HiCheckCircle className="text-blue-600" size={18} />,
      rejected: <HiXCircle className="text-red-600" size={18} />,
      refunded: <HiCheckCircle className="text-green-600" size={18} />,
      cancelled: <HiXCircle className="text-gray-600" size={18} />,
    };
    return icons[status] || <HiClock className="text-gray-600" size={18} />;
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

  const statusOptions = ["pending", "approved", "rejected", "refunded", "cancelled"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B9D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading return requests...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Return Requests</h1>
            <p className="text-gray-600">Manage customer return requests and process refunds</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Return ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Refund Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Requested
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map((returnReq) => (
                    <tr key={returnReq.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">#{returnReq.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders`}
                          onClick={(e) => {
                            e.preventDefault();
                            // Scroll to order in orders page
                            window.open(`/admin/orders`, '_blank');
                          }}
                          className="text-sm text-[#FF6B9D] hover:text-[#FF5A8A] hover:underline font-semibold"
                        >
                          Order #{returnReq.order_id}
                        </Link>
                        {returnReq.order_details && (
                          <div className="text-xs text-gray-500 mt-1">
                            ₵{parseFloat(returnReq.order_details.total || 0).toFixed(2)}
                            {returnReq.order_details.status && (
                              <span className="ml-2">• {returnReq.order_details.status}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 capitalize">
                          {returnReq.reason.replace('_', ' ')}
                        </div>
                        {returnReq.order_item_details && (
                          <div className="text-xs text-gray-500">
                            {returnReq.order_item_details.product_title}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {returnReq.approved_refund_amount ? (
                            <>
                              <span className="font-semibold text-green-600">
                                ₵{parseFloat(returnReq.approved_refund_amount).toFixed(2)}
                              </span>
                              {returnReq.requested_refund_amount && (
                                <div className="text-xs text-gray-500">
                                  Requested: ₵{parseFloat(returnReq.requested_refund_amount).toFixed(2)}
                                </div>
                              )}
                            </>
                          ) : returnReq.requested_refund_amount ? (
                            <span className="text-gray-600">
                              ₵{parseFloat(returnReq.requested_refund_amount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={returnReq.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/return-requests/${returnReq.id}/`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: newStatus }),
                              });
                              if (res.ok) {
                                const updated = await res.json();
                                setReturns(returns.map(r => r.id === returnReq.id ? updated : r));
                                toast.success("Status updated successfully");
                                await fetchReturns();
                              } else {
                                const errorData = await res.json();
                                toast.error(errorData.detail || errorData.error || "Failed to update status");
                              }
                            } catch (error) {
                              toast.error("Error updating status");
                            }
                          }}
                          className={`text-xs font-semibold rounded-full border px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] cursor-pointer ${getStatusColor(returnReq.status)}`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDate(returnReq.requested_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(returnReq)}
                            className="text-blue-600 hover:text-blue-700 transition px-2 py-1 rounded hover:bg-blue-50"
                            title="Edit return request"
                          >
                            <HiEye size={18} />
                          </button>
                          {returnReq.status === 'approved' && !returnReq.refund_reference && editForm.approved_refund_amount && (
                            <button
                              onClick={() => processRefund(returnReq.id)}
                              disabled={processingRefundId === returnReq.id}
                              className="text-green-600 hover:text-green-700 transition disabled:opacity-50 px-2 py-1 rounded hover:bg-green-50"
                              title="Process refund"
                            >
                              <HiCurrencyDollar size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {returns.length === 0 && (
              <div className="text-center py-12">
                <HiShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No return requests found</p>
              </div>
            )}
          </div>

          {/* Detail Modal for Editing */}
          {editingId && (() => {
            const returnReq = returns.find(r => r.id === editingId);
            if (!returnReq) return null;

            return (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Return Request #{returnReq.id}
                      </h2>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({ status: "", approved_refund_amount: "", admin_notes: "" });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <HiX size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Order Information</h3>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Link
                          href={`/admin/orders`}
                          target="_blank"
                          className="text-[#FF6B9D] hover:text-[#FF5A8A] hover:underline font-semibold"
                        >
                          Order #{returnReq.order_id}
                        </Link>
                        {returnReq.order_details && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              Total: ₵{parseFloat(returnReq.order_details.total || 0).toFixed(2)}
                            </span>
                            {returnReq.order_details.status && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600 capitalize">
                                  {returnReq.order_details.status}
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      {returnReq.order_item_details ? (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                          <p className="font-semibold text-gray-900">{returnReq.order_item_details.product_title || "Product"}</p>
                          <p className="text-gray-600">Quantity: {returnReq.order_item_details.quantity}</p>
                          <p className="text-gray-600">Item Total: ₵{parseFloat(returnReq.order_item_details.item_total || 0).toFixed(2)}</p>
                        </div>
                      ) : (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                          Full Order Return
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Return Reason</h3>
                      <p className="text-sm text-gray-600 capitalize mb-2">
                        {returnReq.reason.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-900">{returnReq.reason_description}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approved Refund Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₵</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.approved_refund_amount}
                          onChange={(e) => setEditForm({ ...editForm, approved_refund_amount: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                          placeholder="0.00"
                        />
                      </div>
                      {returnReq.requested_refund_amount && (
                        <p className="text-xs text-gray-500 mt-1">
                          Customer requested: ₵{parseFloat(returnReq.requested_refund_amount).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Admin Notes
                      </label>
                      <textarea
                        value={editForm.admin_notes}
                        onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                        placeholder="Internal notes (not visible to customer)..."
                      />
                    </div>

                    {returnReq.refund_reference && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <span className="font-semibold">Refund Processed:</span> Reference #{returnReq.refund_reference}
                        </p>
                        {returnReq.processed_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Processed on {formatDate(returnReq.processed_at)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => updateReturnRequest(returnReq.id)}
                        className="flex-1 bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        Save Changes
                      </button>
                      {editForm.status === 'approved' && !returnReq.refund_reference && (
                        <button
                          onClick={() => {
                            updateReturnRequest(returnReq.id).then(() => {
                              if (editForm.approved_refund_amount) {
                                processRefund(returnReq.id);
                              }
                            });
                          }}
                          disabled={processingRefundId === returnReq.id || !editForm.approved_refund_amount}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <HiCurrencyDollar size={18} />
                          {processingRefundId === returnReq.id ? "Processing..." : "Approve & Process Refund"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({ status: "", approved_refund_amount: "", admin_notes: "" });
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
