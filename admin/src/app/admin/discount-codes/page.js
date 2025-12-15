"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiPlus, HiPencil, HiTrash, HiTag, HiMenu, HiX } from "react-icons/hi";
import toast from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function AdminDiscountCodes() {
  const router = useRouter();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_purchase_amount: "",
    max_discount_amount: "",
    is_active: true,
    usage_limit: "",
    valid_from: "",
    valid_until: "",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    fetchCodes();
  }, [accessToken, router]);

  async function fetchCodes() {
    try {
      const res = await authenticatedFetch("http://127.0.0.1:8000/api/discount-codes/");
      if (res.ok) {
        const data = await res.json();
        setCodes(data);
      }
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const loadingToast = toast.loading(editingId ? "Updating discount code..." : "Adding discount code...");

    try {
      const url = editingId
        ? `http://127.0.0.1:8000/api/discount-codes/${editingId}/`
        : "http://127.0.0.1:8000/api/discount-codes/";
      const method = editingId ? "PATCH" : "POST";

      const payload = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value ? parseFloat(formData.discount_value) : 0,
        min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
        is_active: formData.is_active,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
      };

      const token = localStorage.getItem("admin_access");
      if (!token) {
        toast.dismiss(loadingToast);
        toast.error("Please log in again");
        router.push("/");
        return;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        toast.dismiss(loadingToast);
        if (editingId) {
          setCodes(codes.map((code) => (code.id === editingId ? data : code)));
          toast.success("Discount code updated successfully");
        } else {
          setCodes([...codes, data]);
          toast.success("Discount code added successfully");
        }
        resetForm();
        await fetchCodes();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.dismiss(loadingToast);
        toast.error(errorData.error || errorData.detail || "Failed to save discount code");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error saving discount code");
      console.error("Error:", error);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this discount code?")) return;

    try {
      const res = await authenticatedFetch(`http://127.0.0.1:8000/api/discount-codes/${id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCodes(codes.filter((code) => code.id !== id));
        toast.success("Discount code deleted successfully");
      } else {
        toast.error("Failed to delete discount code");
      }
    } catch (error) {
      toast.error("Error deleting discount code");
    }
  }

  function handleEdit(code) {
    setEditingId(code.id);
    setFormData({
      code: code.code || "",
      description: code.description || "",
      discount_type: code.discount_type || "percentage",
      discount_value: code.discount_value || "",
      min_purchase_amount: code.min_purchase_amount || "",
      max_discount_amount: code.max_discount_amount || "",
      is_active: code.is_active !== undefined ? code.is_active : true,
      usage_limit: code.usage_limit || "",
      valid_from: code.valid_from ? code.valid_from.split('T')[0] : "",
      valid_until: code.valid_until ? code.valid_until.split('T')[0] : "",
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      min_purchase_amount: "",
      max_discount_amount: "",
      is_active: true,
      usage_limit: "",
      valid_from: "",
      valid_until: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function handleLogout() {
    localStorage.removeItem("admin_access");
    localStorage.removeItem("admin_refresh");
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B9D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading discount codes...</p>
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
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Discount Codes</h1>
              <p className="text-gray-600">Manage discount codes and promotions</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <HiPlus size={20} />
              Add Discount Code
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">{editingId ? "Edit" : "Add"} Discount Code</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                      placeholder="SAVE10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                      placeholder="10% off on orders"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                      placeholder={formData.discount_type === "percentage" ? "10" : "50"}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.discount_type === "percentage" ? "Percentage (e.g., 10 for 10%)" : "Amount in ₵"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Purchase Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.min_purchase_amount}
                      onChange={(e) => setFormData({ ...formData, min_purchase_amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                      placeholder="0"
                    />
                  </div>
                  {formData.discount_type === "percentage" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Discount Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.max_discount_amount}
                        onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                        placeholder="Leave empty for no limit"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid From
                    </label>
                    <input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-[#FF6B9D] focus:ring-[#FF6B9D] border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    {editingId ? "Update" : "Add"} Discount Code
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Min Purchase
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{code.code}</div>
                        {code.description && (
                          <div className="text-xs text-gray-500">{code.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 capitalize">{code.discount_type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {code.discount_type === "percentage"
                            ? `${code.discount_value}%`
                            : `₵${code.discount_value}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {code.min_purchase_amount > 0 ? `₵${code.min_purchase_amount}` : "Any"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {code.times_used || 0} / {code.usage_limit || "∞"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            code.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {code.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(code)}
                            className="text-[#FF6B9D] hover:text-[#FF5A8A] transition"
                          >
                            <HiPencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(code.id)}
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <HiTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {codes.length === 0 && (
              <div className="text-center py-12">
                <HiTag size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No discount codes found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
