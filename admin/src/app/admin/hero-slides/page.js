"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HiPlus, HiPencil, HiTrash, HiArrowUp, HiArrowDown, HiMenu, HiX, HiTrendingUp } from "react-icons/hi";
import toast from "react-hot-toast";
import Image from "next/image";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function AdminHeroSlides() {
  const router = useRouter();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    description: "",
    cta1_text: "Shop Now",
    cta1_link: "/products",
    cta2_text: "",
    cta2_link: "",
    background_image: null,
    mobile_image: null,
    tablet_image: null,
    is_active: true,
    order: 0,
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [mobileImagePreview, setMobileImagePreview] = useState(null);
  const [tabletImagePreview, setTabletImagePreview] = useState(null);
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
    fetchSlides();
  }, [accessToken, router]);

  async function fetchSlides() {
    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-slides/");
      if (res.ok) {
        const data = await res.json();
        setSlides(data);
      }
    } catch (error) {
      console.error("Error fetching slides:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e, type = "background") {
    const file = e.target.files[0];
    if (file) {
      if (type === "background") {
        setFormData({ ...formData, background_image: file });
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else if (type === "mobile") {
        setFormData({ ...formData, mobile_image: file });
        const reader = new FileReader();
        reader.onloadend = () => {
          setMobileImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else if (type === "tablet") {
        setFormData({ ...formData, tablet_image: file });
        const reader = new FileReader();
        reader.onloadend = () => {
          setTabletImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("subtitle", formData.subtitle);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("cta1_text", formData.cta1_text);
      formDataToSend.append("cta1_link", formData.cta1_link);
      if (formData.cta2_text) {
        formDataToSend.append("cta2_text", formData.cta2_text);
        formDataToSend.append("cta2_link", formData.cta2_link);
      }
      formDataToSend.append("is_active", formData.is_active);
      formDataToSend.append("order", formData.order);
      if (formData.background_image && typeof formData.background_image !== 'string') {
        formDataToSend.append("background_image", formData.background_image);
      }
      if (formData.mobile_image && typeof formData.mobile_image !== 'string') {
        formDataToSend.append("mobile_image", formData.mobile_image);
      }
      if (formData.tablet_image && typeof formData.tablet_image !== 'string') {
        formDataToSend.append("tablet_image", formData.tablet_image);
      }

      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/hero-slides/${editingId}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/hero-slides/";
      const method = editingId ? "PUT" : "POST";

      const res = await authenticatedFetch(url, {
        method,
        body: formDataToSend,
        // Don't set Content-Type for FormData, browser will set it with boundary
      });

      if (res.ok) {
        const data = await res.json();
        if (editingId) {
          setSlides(slides.map((s) => (s.id === editingId ? data : s)));
          toast.success("Slide updated");
        } else {
          setSlides([...slides, data]);
          toast.success("Slide added");
        }
        resetForm();
      } else {
        const errorData = await res.json();
        toast.error(errorData.detail || "Failed to save slide");
      }
    } catch (error) {
      toast.error("Error saving slide");
    }
  }

  async function deleteSlide(id) {
    if (!confirm("Are you sure you want to delete this slide?")) return;

    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-slides/${id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSlides(slides.filter((s) => s.id !== id));
        toast.success("Slide deleted");
      } else {
        toast.error("Failed to delete slide");
      }
    } catch (error) {
      toast.error("Error deleting slide");
    }
  }

  function handleEdit(slide) {
    setEditingId(slide.id);
    setFormData({
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      description: slide.description || "",
      cta1_text: slide.cta1_text || "Shop Now",
      cta1_link: slide.cta1_link || "/products",
      cta2_text: slide.cta2_text || "",
      cta2_link: slide.cta2_link || "",
      background_image: slide.background_image || null,
      mobile_image: slide.mobile_image || null,
      tablet_image: slide.tablet_image || null,
      is_active: slide.is_active,
      order: slide.order || 0,
    });
    setImagePreview(slide.background_image || null);
    setMobileImagePreview(slide.mobile_image || null);
    setTabletImagePreview(slide.tablet_image || null);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      title: "",
      subtitle: "",
      description: "",
      cta1_text: "Shop Now",
      cta1_link: "/products",
      cta2_text: "",
      cta2_link: "",
      background_image: null,
      mobile_image: null,
      tablet_image: null,
      is_active: true,
      order: 0,
    });
    setImagePreview(null);
    setMobileImagePreview(null);
    setTabletImagePreview(null);
    setShowForm(false);
    setEditingId(null);
  }

  async function moveSlide(id, direction) {
    const currentSlideIndex = slides.findIndex(slide => slide.id === id);
    if (currentSlideIndex === -1) return;

    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(currentSlideIndex, 1);

    let newIndex = currentSlideIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= newSlides.length) newIndex = newSlides.length;

    newSlides.splice(newIndex, 0, movedSlide);

    const updatedSlidesWithOrder = newSlides.map((slide, index) => ({
      ...slide,
      order: index,
    }));

    setSlides(updatedSlidesWithOrder);

    try {
      for (const slide of updatedSlidesWithOrder) {
        await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-slides/${slide.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ order: slide.order }),
        });
      }
      toast.success("Slide order updated");
    } catch (error) {
      toast.error("Failed to update slide order");
      fetchSlides();
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
          <p className="text-gray-600">Loading hero slides...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Hero Slides</h1>
              <p className="text-gray-600">Manage your homepage hero section slides</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B9D] to-[#FF5A8A] text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
            >
              <HiPlus size={20} />
              {showForm ? "Cancel" : "Add Slide"}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                {editingId ? "Edit Hero Slide" : "Add New Hero Slide"}
              </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-md p-2"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">CTA 1 Text</label>
                  <input
                    type="text"
                    value={formData.cta1_text}
                    onChange={(e) => setFormData({ ...formData, cta1_text: e.target.value })}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CTA 1 Link</label>
                  <input
                    type="text"
                    value={formData.cta1_link}
                    onChange={(e) => setFormData({ ...formData, cta1_link: e.target.value })}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CTA 2 Text (Optional)</label>
                  <input
                    type="text"
                    value={formData.cta2_text}
                    onChange={(e) => setFormData({ ...formData, cta2_text: e.target.value })}
                    className="w-full border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CTA 2 Link (Optional)</label>
                  <input
                    type="text"
                    value={formData.cta2_link}
                    onChange={(e) => setFormData({ ...formData, cta2_link: e.target.value })}
                    className="w-full border rounded-md p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Background Image (Desktop)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "background")}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={300}
                      height={200}
                      className="rounded-md"
                      unoptimized
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mobile Image (Optional - for screens smaller than 768px)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "mobile")}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                />
                {mobileImagePreview && (
                  <div className="mt-2">
                    <Image
                      src={mobileImagePreview}
                      alt="Mobile Preview"
                      width={300}
                      height={200}
                      className="rounded-md"
                      unoptimized
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">If not provided, desktop image will be used</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tablet Image (Optional - for screens 768px to 1024px)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "tablet")}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                />
                {tabletImagePreview && (
                  <div className="mt-2">
                    <Image
                      src={tabletImagePreview}
                      alt="Tablet Preview"
                      width={300}
                      height={200}
                      className="rounded-md"
                      unoptimized
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">If not provided, desktop image will be used</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
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
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Title
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
                  {slides.map((slide, index) => (
                    <tr key={slide.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => moveSlide(slide.id, -1)}
                            disabled={index === 0}
                            className="text-gray-400 hover:text-[#FF6B9D] disabled:opacity-50 transition"
                          >
                            <HiArrowUp size={18} />
                          </button>
                          <button
                            onClick={() => moveSlide(slide.id, 1)}
                            disabled={index === slides.length - 1}
                            className="text-gray-400 hover:text-[#FF6B9D] disabled:opacity-50 transition"
                          >
                            <HiArrowDown size={18} />
                          </button>
                          <span>{slide.order}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {slide.background_image && (
                          <div className="w-20 h-12 rounded-lg overflow-hidden border border-gray-200">
                            <Image
                              src={slide.background_image}
                              alt={slide.title}
                              width={80}
                              height={48}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{slide.title}</div>
                        <div className="text-xs text-gray-500">{slide.subtitle}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            slide.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {slide.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEdit(slide)}
                            className="text-[#FF6B9D] hover:text-[#FF5A8A] transition"
                            title="Edit"
                          >
                            <HiPencil size={18} />
                          </button>
                          <button
                            onClick={() => deleteSlide(slide.id)}
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
            {slides.length === 0 && (
              <div className="text-center py-12">
                <HiTrendingUp size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No hero slides found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

