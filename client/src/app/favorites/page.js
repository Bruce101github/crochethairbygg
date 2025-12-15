"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { HiHeart, HiShoppingBag, HiTrash } from "react-icons/hi";
import toast from "react-hot-toast";
import VariationPopup from "@/components/VariationPopup";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showVariationPopup, setShowVariationPopup] = useState(false);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    if (accessToken) {
      fetchFavorites();
    }
    
    // Listen for favorites update events
    const handleFavoritesUpdate = () => {
      if (accessToken) {
        fetchFavorites();
      }
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, [accessToken]);

  async function fetchFavorites() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Favorites API response:", data);
        console.log("Number of favorites:", Array.isArray(data) ? data.length : 'Not an array');
        // Ensure data is an array
        const favoritesArray = Array.isArray(data) ? data : (data.results || []);
        setFavorites(favoritesArray);
      } else {
        console.error("Failed to fetch favorites:", res.status, res.statusText);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }

  async function removeFavorite(id) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/favorites/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        setFavorites(favorites.filter((fav) => fav.id !== id));
        toast.success("Removed from favorites");
        // Trigger update events for listing and product pages to refresh like status
        window.dispatchEvent(new Event('favoritesUpdated'));
      } else {
        toast.error("Failed to remove");
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Error removing favorite");
    }
  }

  async function handleAddToCart(e, product) {
    e.preventDefault();
    e.stopPropagation();

    if (!accessToken) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    // If product has multiple variants, show popup
    if (product.variants && product.variants.length > 1) {
      setSelectedProduct(product);
      setShowVariationPopup(true);
      return;
    }

    // If single variant, add directly to cart
    toast.loading("Adding to bag...");
    try {
      // First, fetch current cart
      const getCartRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      let existingItems = [];
      let cartExists = false;
      let cartId = null;
      let cart = null;
      
      if (getCartRes.ok) {
        const cartData = await getCartRes.json();
        cart = Array.isArray(cartData) && cartData.length > 0 ? cartData[0] : cartData;
        if (cart && cart.id) {
          cartExists = true;
          cartId = cart.id;
          if (cart.items && cart.items.length > 0) {
            existingItems = cart.items.map((item) => ({
              id: item.id,
              variant_id: item.variant.id,
              quantity: item.quantity,
            }));
          }
        }
      }

      // Check if variant already exists in cart
      const existingItemIndex = existingItems.findIndex(
        (item) => item.variant_id === product.variants[0].id
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        existingItems[existingItemIndex].quantity += 1;
      } else {
        // Add new item (don't include id for new items)
        existingItems.push({
          variant_id: product.variants[0].id,
          quantity: 1,
        });
      }

      // Determine method: POST if no cart exists, PUT if cart exists
      let res;
      if (cartExists && cartId) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart/${cartId}/`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: existingItems,
          }),
        });
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart/", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: existingItems,
          }),
        });
      }

      if (res.ok) {
        toast.dismiss();
        toast.success("Added to bag!");
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        const errorText = await res.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || "Failed to add to bag" };
        }
        console.error("Cart error:", errorData);
        toast.dismiss();
        toast.error(errorData.error || errorData.detail || "Failed to add to bag");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to add to bag");
      console.error(err);
    }
  }

  function priceRange(variants) {
    if (!variants || variants.length === 0) return "₵0";
    const prices = variants.map((variant) => variant.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice
      ? `₵${minPrice}`
      : `₵${minPrice} - ₵${maxPrice}`;
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
      <VariationPopup
        product={selectedProduct}
        isOpen={showVariationPopup}
        onClose={() => {
          setShowVariationPopup(false);
          setSelectedProduct(null);
        }}
        accessToken={accessToken}
      />
      <div className="min-h-screen px-2 md:px-5 lg:px-40 pb-20">
        <Breadcrumbs
          items={[
            { label: "Favorites", href: "/favorites" },
          ]}
        />
        <div className="flex items-center gap-2 mb-6">
          <HiHeart size={28} className="text-[#FF6B9D]" />
          <h1 className="text-2xl font-bold">My Favorites</h1>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <HiHeart size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-4">No favorites yet</p>
            <Link
              href="/products"
              className="text-[#FF6B9D] hover:underline font-semibold"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
            {favorites.map((favorite) => {
              const product = favorite.product;
              return (
                <div
                  key={favorite.id}
                  className="border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition relative group"
                >
                  <Link href={`/products/${product.id}`}>
                    <div className="relative">
                      <Image
                        src={
                          product.images?.[0]?.image ||
                          "/placeholder.jpg"
                        }
                        alt={product.title}
                        width={300}
                        height={300}
                        className="object-cover w-full h-64"
                        unoptimized
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFavorite(favorite.id);
                        }}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <HiTrash size={18} className="text-[#FF6B9D]" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-sm mb-2 line-clamp-2">
                        {product.title}
                      </h3>
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-base">
                          {priceRange(product.variants)}
                        </p>
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          className="bg-[#FF6B9D]/10 text-[#FF6B9D] p-1.5 rounded-full hover:bg-[#FF6B9D] hover:text-white transition"
                        >
                          <HiShoppingBag size={16} />
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
