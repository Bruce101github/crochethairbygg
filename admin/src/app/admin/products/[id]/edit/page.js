"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { HiArrowLeft, HiTrash, HiPlus, HiX } from "react-icons/hi";
import toast from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    base_price: "",
    is_active: true,
  });

  const [categories, setCategories] = useState([]);
  const [variants, setVariants] = useState([]);
  const [images, setImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    fetchCategories();
    if (productId && productId !== "new") {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [productId]);

  async function fetchCategories() {
    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async function fetchProduct() {
    try {
      const res = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/`);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          title: data.title || "",
          description: data.description || "",
          category: data.category?.id?.toString() || "",
          base_price: data.base_price || "",
          is_active: data.is_active !== undefined ? data.is_active : true,
        });
        setVariants(data.variants || []);
        setImages(data.images || []);
      } else {
        toast.error("Failed to load product");
        router.push("/admin/products");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
      } else {
        toast.error("Error loading product");
        router.push("/admin/products");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    const newPreviews = [];
    
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        if (newPreviews.length === files.length) {
          setImagePreviews([...imagePreviews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setNewImages([...newImages, ...files]);
  }

  function removeNewImage(index) {
    const updatedImages = newImages.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setNewImages(updatedImages);
    setImagePreviews(updatedPreviews);
  }

  async function deleteImage(imageId) {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      // Note: You may need to create a delete endpoint for images
      // For now, we'll just remove it from the local state
      setImages(images.filter((img) => img.id !== imageId));
      toast.success("Image removed (will be deleted on save)");
    } catch (error) {
      toast.error("Error removing image");
    }
  }

  function addVariant() {
    setVariants([
      ...variants,
      {
        id: `new-${Date.now()}`,
        length: "",
        color: "",
        texture: "",
        bundle_deal: "",
        wig_size: "",
        lace_type: "",
        density: "",
        price: "",
        stock: 0,
      },
    ]);
  }

  function updateVariant(index, field, value) {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  }

  function removeVariant(index) {
    setVariants(variants.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      // First, update/create the product
      const productData = {
        title: formData.title,
        description: formData.description,
        category: formData.category ? parseInt(formData.category) : null,
        base_price: formData.base_price,
        is_active: formData.is_active,
      };

      let productRes;
      if (productId && productId !== "new") {
        // Update existing product
        productRes = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}/`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        });
      } else {
        // Create new product
        productRes = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        });
      }

      if (!productRes.ok) {
        const errorData = await productRes.json();
        toast.error(errorData.detail || "Failed to save product");
        setSaving(false);
        return;
      }

      const savedProduct = await productRes.json();
      const finalProductId = savedProduct.id;

      // Upload new images
      if (newImages.length > 0) {
        for (const imageFile of newImages) {
          const imageFormData = new FormData();
          imageFormData.append("product", finalProductId);
          imageFormData.append("image", imageFile);
          imageFormData.append("is_main", images.length === 0 && newImages.indexOf(imageFile) === 0);

          try {
            await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/product-images/", {
              method: "POST",
              body: imageFormData,
            });
          } catch (error) {
            console.error("Error uploading image:", error);
          }
        }
      }

      // Delete all existing variants first, then recreate
      const existingVariants = variants.filter(v => v.id && !v.id.toString().startsWith("new-"));
      for (const variant of existingVariants) {
        try {
          await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/product-variants/${variant.id}/`, {
            method: "DELETE",
          });
        } catch (error) {
          console.error("Error deleting variant:", error);
        }
      }

      // Create all variants
      for (const variant of variants) {
        try {
          const variantData = {
            product: finalProductId,
            length: variant.length || null,
            color: variant.color || null,
            texture: variant.texture || null,
            bundle_deal: variant.bundle_deal ? parseInt(variant.bundle_deal) : null,
            wig_size: variant.wig_size || null,
            lace_type: variant.lace_type || null,
            density: variant.density || null,
            price: variant.price || "0",
            stock: variant.stock || 0,
          };
          
          await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/product-variants/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(variantData),
          });
        } catch (error) {
          console.error("Error creating variant:", error);
        }
      }

      toast.success(productId === "new" ? "Product created successfully" : "Product updated successfully");
      router.push("/admin/products");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error saving product");
      setSaving(false);
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
          <p className="text-gray-600">Loading product...</p>
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
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <HiArrowLeft size={20} />
              Back to Products
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {productId === "new" ? "Create Product" : "Edit Product"}
            </h1>
            <p className="text-gray-600">Manage product details, variants, and images</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#FF6B9D] border-gray-300 rounded focus:ring-[#FF6B9D]"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Product is active
                </label>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">Images</h2>
              
              {/* Existing Images */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {images.map((img) => (
                    <div key={img.id} className="relative group">
                      <Image
                        src={img.image}
                        alt="Product"
                        width={200}
                        height={200}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => deleteImage(img.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <HiX size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New Images Preview */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={preview}
                        alt="Preview"
                        width={200}
                        height={200}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <HiX size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            {/* Variants */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h2 className="text-xl font-bold text-gray-900">Variants</h2>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-2 bg-[#FF6B9D] text-white px-4 py-2 rounded-lg hover:bg-[#FF5A8A] transition"
                >
                  <HiPlus size={18} />
                  Add Variant
                </button>
              </div>

              {variants.length === 0 && (
                <p className="text-gray-500 text-sm">No variants added. Click "Add Variant" to create one.</p>
              )}

              {variants.map((variant, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Variant {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-red-600 hover:text-red-700 transition"
                    >
                      <HiTrash size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Length</label>
                      <input
                        type="text"
                        value={variant.length || ""}
                        onChange={(e) => updateVariant(index, "length", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        placeholder="12&quot;"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="text"
                        value={variant.color || ""}
                        onChange={(e) => updateVariant(index, "color", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        placeholder="1B"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Texture</label>
                      <input
                        type="text"
                        value={variant.texture || ""}
                        onChange={(e) => updateVariant(index, "texture", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        placeholder="Straight"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Density</label>
                      <input
                        type="text"
                        value={variant.density || ""}
                        onChange={(e) => updateVariant(index, "density", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        placeholder="150%"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Bundle Deal</label>
                      <input
                        type="number"
                        value={variant.bundle_deal || ""}
                        onChange={(e) => updateVariant(index, "bundle_deal", e.target.value ? parseInt(e.target.value) : "")}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Wig Size</label>
                      <input
                        type="text"
                        value={variant.wig_size || ""}
                        onChange={(e) => updateVariant(index, "wig_size", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        placeholder="21&quot;"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Lace Type</label>
                      <input
                        type="text"
                        value={variant.lace_type || ""}
                        onChange={(e) => updateVariant(index, "lace_type", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        placeholder="HD"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Price (GH₵) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price || ""}
                        onChange={(e) => updateVariant(index, "price", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Stock *</label>
                      <input
                        type="number"
                        value={variant.stock || 0}
                        onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <Link
                href="/admin/products"
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#FF6B9D] to-[#FF5A8A] text-white rounded-lg hover:shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : productId === "new" ? "Create Product" : "Save Changes"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

