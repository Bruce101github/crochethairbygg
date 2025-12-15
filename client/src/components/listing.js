"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { HiShoppingBag, HiHeart } from "react-icons/hi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import VariationPopup from "./VariationPopup";

// Stable default filters object to prevent unnecessary re-renders
const DEFAULT_FILTERS = {};

export default function Listing({ searchQuery, filters = DEFAULT_FILTERS, sortBy = "base_price" }) {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [likedProducts, setLikedProducts] = useState(new Set());
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showVariationPopup, setShowVariationPopup] = useState(false);
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });
  
  // Use refs to track previous values and prevent unnecessary fetches
  const prevFiltersRef = useRef(JSON.stringify(filters));
  const prevSearchQueryRef = useRef(searchQuery);
  const prevSortByRef = useRef(sortBy);
  const hasFetchedRef = useRef(false);
  
  function fetchProducts() {
    let url = "http://127.0.0.1:8000/api/products/";
    const params = new URLSearchParams();
    
    if (searchQuery) {
      params.append("search", searchQuery);
    }
    
    // Add filters
    if (filters.category && filters.category.length > 0) {
      filters.category.forEach((catSlug) => {
        params.append("category__slug", catSlug);
      });
    }
    
    if (filters.length && filters.length.length > 0) {
      filters.length.forEach((length) => {
        params.append("variants__length", length);
      });
    }
    
    if (filters.color && filters.color.length > 0) {
      filters.color.forEach((color) => {
        params.append("variants__color", color);
      });
    }
    
    if (filters.texture && filters.texture.length > 0) {
      filters.texture.forEach((texture) => {
        params.append("variants__texture", texture);
      });
    }
    
    // Add sorting
    if (sortBy) {
      params.append("ordering", sortBy);
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Network response not ok");
        return res.json();
      })
      .then((products) => {
        // Apply price filter on client side if needed
        let filteredProducts = products;
        
        if (filters.priceMin !== null || filters.priceMax !== null) {
          filteredProducts = products.filter((product) => {
            const prices = product.variants.map((v) => parseFloat(v.price));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            if (filters.priceMin !== null && maxPrice < filters.priceMin) return false;
            if (filters.priceMax !== null && minPrice > filters.priceMax) return false;
            return true;
          });
        }
        
        setProducts(filteredProducts);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });
  }

  function priceRange(variants) {
    const prices = variants.map((variant) => variant.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice
      ? `₵${minPrice}`
      : `₵${minPrice} - ₵${maxPrice}`;
  }

  function UrgencyBadge({ variants }) {
    const totalStock = variants.reduce(
      (sum, variant) => sum + variant.stock,
      0
    );
    const stock = totalStock;
    const lowStockMessages = [
      (stock) => `Only ${stock} left in stock!`,
      () => `Almost gone!`,
      // Add more if you want
    ];
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
      if (totalStock > 0 && totalStock <= 10) {
        const interval = setInterval(() => {
          setMessageIndex((prev) => (prev + 1) % lowStockMessages.length);
        }, 3000); // rotate every 3 seconds

        return () => clearInterval(interval);
      }
    }, [lowStockMessages.length, totalStock]);

    if (stock > 10) return null;
    if (stock > 0) {
      return (
        <span className="text-[#FF6B9D] text-sm font-semibold mt-1">
          {lowStockMessages[messageIndex](stock)}
        </span>
      );
    } else {
      return (
        <span className="text-red-600 text-sm font-semibold mt-1">
          Out of Stock
        </span>
      );
    }
  }

  useEffect(() => {
    const filtersString = JSON.stringify(filters);
    const searchChanged = prevSearchQueryRef.current !== searchQuery;
    const filtersChanged = prevFiltersRef.current !== filtersString;
    const sortChanged = prevSortByRef.current !== sortBy;
    
    // Only fetch if something actually changed or if it's the first render
    if (searchChanged || filtersChanged || sortChanged || !hasFetchedRef.current) {
    fetchProducts();
      prevSearchQueryRef.current = searchQuery;
      prevFiltersRef.current = filtersString;
      prevSortByRef.current = sortBy;
      hasFetchedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters, sortBy]);

  useEffect(() => {
    // Function to refresh like status for all products
    const refreshLikeStatus = () => {
    if (accessToken && products.length > 0) {
        const likedSet = new Set();
        const promises = products.map((product) =>
        fetch(`http://127.0.0.1:8000/api/products/${product.id}/like/`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
          .then((res) => {
            if (res.ok) {
              return res.json();
            }
              return null;
          })
          .then((data) => {
            if (data && data.liked) {
                likedSet.add(product.id);
            }
          })
          .catch((err) => {
            // Silently fail - user might not be authenticated
            })
        );
        
        Promise.all(promises).then(() => {
          setLikedProducts(likedSet);
      });
    }
    };

    // Initial refresh when products or accessToken changes
    refreshLikeStatus();

    // Listen for favorites update events to refresh like status
    const handleFavoritesUpdate = () => {
      refreshLikeStatus();
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, [products, accessToken]);

  const handleLike = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!accessToken) {
      router.push("/signin");
      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/products/${productId}/like/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setLikedProducts((prev) => {
          const newSet = new Set(prev);
          if (data.liked) {
            newSet.add(productId);
          } else {
            newSet.delete(productId);
          }
          return newSet;
        });
        // Update product like count in state
        setProducts((prevProducts) =>
          prevProducts.map((p) =>
            p.id === productId
              ? { ...p, like_count: data.like_count }
              : p
          )
        );

        // Also add/remove from favorites
        try {
          if (data.liked) {
            // Add to favorites
            const favRes = await fetch("http://127.0.0.1:8000/api/favorites/", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                product_id: productId,
              }),
            });
            if (favRes.ok) {
              window.dispatchEvent(new Event('favoritesUpdated'));
            }
          } else {
            // Remove from favorites - need to find favorite ID first
            const favListRes = await fetch("http://127.0.0.1:8000/api/favorites/", {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
            if (favListRes.ok) {
              const favorites = await favListRes.json();
              const favorite = favorites.find((f) => f.product.id === parseInt(productId));
              if (favorite) {
                await fetch(`http://127.0.0.1:8000/api/favorites/${favorite.id}/`, {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                });
                window.dispatchEvent(new Event('favoritesUpdated'));
              }
            }
          }
        } catch (favErr) {
          console.error("Error updating favorites:", favErr);
        }
      }
    } catch (err) {
      console.error("Failed to like product:", err);
    }
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    // If product has multiple variants, show popup (for both guest and authenticated)
    if (product.variants.length > 1) {
      setSelectedProduct(product);
      setShowVariationPopup(true);
      return;
    }

    // Guest checkout - use localStorage cart
    if (!accessToken) {
      toast.loading("Adding to bag...");
      try {
        const { addToGuestCart } = await import("@/utils/guestCart");
        const variant = product.variants[0];
        
        addToGuestCart({
          id: variant.id,
          price: variant.price,
          product_id: product.id,
          product_title: product.title,
          product_images: product.images || [],
          product: product
        }, 1);

        toast.dismiss();
        toast.success("Added to bag!");
        
        // Trigger cart update event for navbar
        window.dispatchEvent(new Event('cartUpdated'));
        return;
      } catch (error) {
        toast.dismiss();
        toast.error("Failed to add to bag");
      return;
      }
    }

    // Authenticated user - use API
    // If single variant, add directly to cart
    toast.loading("Adding to bag...");
    try {
      // First, fetch current cart
      const getCartRes = await fetch("http://127.0.0.1:8000/api/cart/", {
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
        
        // Use PUT with cart ID
        res = await fetch(`http://127.0.0.1:8000/api/cart/${cartId}/`, {
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
        // Use POST to create new cart
        res = await fetch("http://127.0.0.1:8000/api/cart/", {
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
        // Trigger cart update event for navbar
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
    }
  };

  return (
    <>
      <VariationPopup
        product={selectedProduct}
        isOpen={showVariationPopup}
        onClose={() => {
          setShowVariationPopup(false);
          setSelectedProduct(null);
        }}
        onAddToCart={() => {
          // Cart update event is already dispatched in the popup
        }}
        accessToken={accessToken}
      />
    <div className="grid grid-cols-2 gap-2 md:gap-4 lg:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <Link href={`/products/${product.id}`} key={product.id}>
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-[#FF6B9D] hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800 group">
          <div className="relative overflow-hidden">
            <Image
              src={product.images[0]?.image || "/placeholder.jpg"}
              alt={product.title}
              width={300}
              height={300}
              className="object-cover w-full lg:h-80 h-48 group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            {product.variants.length > 1 && (
              <div className="absolute top-2 left-2 bg-[#FF6B9D] text-white text-sm font-semibold px-2 py-1 rounded z-10">
                {product.variants.length} Options
              </div>
            )}
            <button
              onClick={(e) => handleLike(e, product.id)}
              className="Wk88 absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 z-10 hover:scale-110"
            >
                <HiHeart
                size={20}
                fill={likedProducts.has(product.id) ? "#FF6B9D" : "none"}
                stroke={likedProducts.has(product.id) ? "#FF6B9D" : "#FF6B9D"}
                strokeWidth={2}
                className="transition-all duration-300"
              />
            </button>
          </div>
          <div className="p-3 lg:p-4 flex flex-col">
            <h2
              className="font-semibold text-base lg:text-lg text-gray-900 dark:text-white mb-2 truncate"
            >
              {product.title}
            </h2>
            <div className="flex justify-between items-center mt-auto">
              <div>
                <p className="font-bold text-base lg:text-xl text-gray-900 dark:text-white">
                  {priceRange(product.variants)}
                </p>
                <UrgencyBadge variants={product.variants} />
              </div>
              <button
                onClick={(e) => handleAddToCart(e, product)}
                className="w-fit bg-[#FF6B9D]/10 text-[#FF6B9D] p-2 rounded-full flex items-center justify-center hover:bg-[#FF6B9D] hover:text-white transition-all duration-300 z-10"
              >
                <HiShoppingBag size={18} />
              </button>
            </div>
          </div>
        </div></Link>
      ))}
    </div>
    </>
  );
}
