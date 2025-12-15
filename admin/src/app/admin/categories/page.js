"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HiPlus, HiPencil, HiTrash, HiShoppingBag, HiMenu, HiX } from "react-icons/hi";
import toast from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function AdminCategories() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", image: null });
  const [imagePreview, setImagePreview] = useState(null);
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
    fetchCategories();
  }, [accessToken, router]);

  async function fetchCategories() {
    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Show loading toast
    const loadingToast = toast.loading(editingId ? "Updating category..." : "Adding category...");

    try {
      const url = editingId
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/categories/${editingId}/`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/categories/`;
      const method = editingId ? "PATCH" : "POST"; // Use PATCH for updates to allow partial updates

      // Use FormData for file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      if (formData.image) {
        formDataToSend.append('image', formData.image);
        console.log("Including image file:", formData.image.name, formData.image.size, "bytes");
      } else if (editingId) {
        // When editing, if no new image is selected, we don't send the image field
        // This allows the backend to keep the existing image
        console.log("Editing without new image - keeping existing image");
      } else {
        console.log("Creating new category without image");
      }

      console.log("Submitting category:", { editingId, name: formData.name, hasImage: !!formData.image });

      // Get access token
      const token = localStorage.getItem("admin_access");
      if (!token) {
        toast.dismiss(loadingToast);
        toast.error("Please log in again");
        router.push("/");
        return;
      }

      // Don't set Content-Type header - browser will set it automatically with boundary for FormData
      console.log("Sending request to:", url, "Method:", method);
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let browser set it for FormData with boundary
        },
        body: formDataToSend,
      });

      console.log("Response status:", res.status, res.statusText);

      if (res.ok) {
        const data = await res.json();
        console.log("Success! Category data:", data);
        toast.dismiss(loadingToast);
        if (editingId) {
          setCategories(
            categories.map((cat) => (cat.id === editingId ? data : cat))
          );
          toast.success("Category updated successfully");
        } else {
          setCategories([...categories, data]);
          toast.success("Category added successfully");
        }
        resetForm();
        // Refresh categories to get updated image URLs
        await fetchCategories();
      } else {
        let errorMessage = `Failed to save category (Status: ${res.status})`;
        try {
          const contentType = res.headers.get("content-type");
          console.log("Response content-type:", contentType);
          
          if (contentType && contentType.includes("application/json")) {
            const errorData = await res.json();
            console.error("Error response JSON:", errorData);
            if (errorData && Object.keys(errorData).length > 0) {
              // Handle field-specific errors
              if (errorData.slug) {
                errorMessage = `Slug error: ${Array.isArray(errorData.slug) ? errorData.slug.join(', ') : errorData.slug}`;
              } else if (errorData.name) {
                errorMessage = `Name error: ${Array.isArray(errorData.name) ? errorData.name.join(', ') : errorData.name}`;
              } else if (errorData.image) {
                errorMessage = `Image error: ${Array.isArray(errorData.image) ? errorData.image.join(', ') : errorData.image}`;
              } else {
                errorMessage = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData);
              }
            } else {
              errorMessage = `Server error (Status: ${res.status}) - Empty response`;
            }
          } else {
            const errorText = await res.text();
            console.error("Error response text:", errorText);
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          console.error("Error parsing response:", e);
          errorMessage = `Failed to save category (Status: ${res.status})`;
        }
        toast.dismiss(loadingToast);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.dismiss(loadingToast);
      toast.error(`Error saving category: ${error.message}`);
    }
  }

  async function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/${id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCategories(categories.filter((cat) => cat.id !== id));
        toast.success("Category deleted successfully");
      } else {
        toast.error("Failed to delete category");
      }
    } catch (error) {
      toast.error("Error deleting category");
    }
  }

  function handleEdit(category) {
    setEditingId(category.id);
    setFormData({ name: category.name, image: null });
    setImagePreview(category.image_url || null);
    setShowForm(true);
  }

  function resetForm() {
    setFormData({ name: "", image: null });
    setImagePreview(null);
    setShowForm(false);
    setEditingId(null);
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
          <p className="text-gray-600">Loading categories...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Categories</h1>
              <p className="text-gray-600">Organize your products into categories</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B9D] to-[#FF5A8A] text-white px-6 py-3 rounded-lg hover:shadow-lg transition font-semibold"
            >
              <HiPlus size={20} />
              {showForm ? "Cancel" : "Add Category"}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                {editingId ? "Edit Category" : "Add New Category"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter category name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Image (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                  />
                  {imagePreview && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-2">Preview:</p>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
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
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="w-12 h-12 object-cover rounded-lg border border-gray-300"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <HiShoppingBag size={20} className="text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-mono">{category.slug}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-[#FF6B9D] hover:text-[#FF5A8A] transition"
                            title="Edit"
                          >
                            <HiPencil size={18} />
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id)}
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
            {categories.length === 0 && (
              <div className="text-center py-12">
                <HiShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No categories found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
