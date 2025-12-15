"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HiPlus, HiPencil, HiTrash, HiArrowUp, HiArrowDown, HiMenu, HiX, HiTrendingUp } from "react-icons/hi";
import toast from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function AdminPromoBanners() {
  const router = useRouter();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    text: "",
    mobile_text: "",
    cta_text: "Get Now",
    cta_link: "/products",
    has_countdown: false,
    countdown_hours: 0,
    countdown_minutes: 0,
    countdown_seconds: 0,
    is_active: true,
    order: 0,
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
    fetchBanners();
  }, [accessToken, router]);

  async function fetchBanners() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/promo-banners/", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/promo-banners/${editingId}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/promo-banners/";
      const method = editingId ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        if (editingId) {
          setBanners(banners.map((b) => (b.id === editingId ? data : b)));
          toast.success("Banner updated");
        } else {
          setBanners([...banners, data]);
          toast.success("Banner added");
        }
        resetForm();
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to save banner");
      }
    } catch (error) {
      toast.error("Error saving banner");
    }
  }

  async function deleteBanner(id) {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/promo-banners/${id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        setBanners(banners.filter((b) => b.id !== id));
        toast.success("Banner deleted");
      } else {
        toast.error("Failed to delete banner");
      }
    } catch (error) {
      toast.error("Error deleting banner");
    }
  }

  function handleEdit(banner) {
    setEditingId(banner.id);
    setFormData({
      text: banner.text || "",
      mobile_text: banner.mobile_text || "",
      cta_text: banner.cta_text || "Get Now",
      cta_link: banner.cta_link || "/products",
      has_countdown: banner.has_countdown || false,
      countdown_hours: banner.countdown_hours || 0,
      countdown_minutes: banner.countdown_minutes || 0,
      countdown_seconds: banner.countdown_seconds || 0,
      is_active: banner.is_active,
      order: banner.order || 0,
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      text: "",
      mobile_text: "",
      cta_text: "Get Now",
      cta_link: "/products",
      has_countdown: false,
      countdown_hours: 0,
      countdown_minutes: 0,
      countdown_seconds: 0,
      is_active: true,
      order: 0,
    });
    setShowForm(false);
    setEditingId(null);
  }

  async function moveBanner(id, direction) {
    const currentBannerIndex = banners.findIndex(banner => banner.id === id);
    if (currentBannerIndex === -1) return;

    const newBanners = [...banners];
    const [movedBanner] = newBanners.splice(currentBannerIndex, 1);

    let newIndex = currentBannerIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= newBanners.length) newIndex = newBanners.length;

    newBanners.splice(newIndex, 0, movedBanner);

    const updatedBannersWithOrder = newBanners.map((banner, index) => ({
      ...banner,
      order: index,
    }));

    setBanners(updatedBannersWithOrder);

            try {
              for (const banner of updatedBannersWithOrder) {
                await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/promo-banners/${banner.id}/`, {
                  method: "PATCH",
                  body: JSON.stringify({ order: banner.order }),
                });
              }
      toast.success("Banner order updated");
    } catch (error) {
      toast.error("Failed to update banner order");
      fetchBanners();
    }
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
          <p className="text-gray-600">Loading promo banners...</p>
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Promo Banners</h1>
              <p className="text-gray-600">Manage promotional banners displayed at the top of your site</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B9D] to-[#FF5A8A] text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
            >
              <HiPlus size={20} />
              {showForm ? "Cancel" : "Add Banner"}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                {editingId ? "Edit Promo Banner" : "Add New Promo Banner"}
              </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                <input
                  type="text"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Text (Shorter)</label>
                <input
                  type="text"
                  value={formData.mobile_text}
                  onChange={(e) => setFormData({ ...formData, mobile_text: e.target.value })}
                  className="w-full border rounded-md p-2"
                  placeholder="Optional - shorter text for mobile"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CTA Text</label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CTA Link</label>
                  <input
                    type="text"
                    value={formData.cta_link}
                    onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                    className="w-full border rounded-md p-2"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_countdown}
                  onChange={(e) => setFormData({ ...formData, has_countdown: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium">Has Countdown</label>
              </div>
              {formData.has_countdown && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={formData.countdown_hours}
                      onChange={(e) =>
                        setFormData({ ...formData, countdown_hours: parseInt(e.target.value) || 0 })
                      }
                      className="w-full border rounded-md p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.countdown_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          countdown_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full border rounded-md p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Seconds</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.countdown_seconds}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          countdown_seconds: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full border rounded-md p-2"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                    }
                    className="w-24 border rounded-md p-2"
                  />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium">Active</label>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#FF6B9D] to-[#FF5A8A] text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
                >
                  {editingId ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
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
                      Order
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Text
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Countdown
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
                  {banners.map((banner, index) => (
                    <tr key={banner.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => moveBanner(banner.id, -1)}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-[#FF6B9D] disabled:opacity-50 transition"
                          >
                            <HiArrowUp size={18} />
                          </button>
                          <button
                            onClick={() => moveBanner(banner.id, 1)}
                            disabled={index === banners.length - 1}
                            className="text-gray-400 hover:text-[#FF6B9D] disabled:opacity-50 transition"
                          >
                            <HiArrowDown size={18} />
                          </button>
                          <span>{banner.order}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{banner.text}</div>
                        {banner.text_mobile && (
                          <div className="text-xs text-gray-500">Mobile: {banner.text_mobile}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {banner.has_countdown ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {String(banner.countdown_hours).padStart(2, "0")}:
                            {String(banner.countdown_minutes).padStart(2, "0")}:
                            {String(banner.countdown_seconds).padStart(2, "0")}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            banner.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {banner.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEdit(banner)}
                            className="text-[#FF6B9D] hover:text-[#FF5A8A] transition"
                            title="Edit"
                          >
                            <HiPencil size={18} />
                          </button>
                          <button
                            onClick={() => deleteBanner(banner.id)}
                            className="text-red-600 hover:text-red-700 transition"
                            title="Delete"
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
            {banners.length === 0 && (
              <div className="text-center py-12">
                <HiTrendingUp size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No promo banners found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

