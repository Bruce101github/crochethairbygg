"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import NextImage from "next/image";
import * as React from "react";
import toast from "react-hot-toast";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { NEXT_CACHE_REVALIDATE_TAG_TOKEN_HEADER } from "next/dist/lib/constants";
import { motion, AnimatePresence } from "motion/react";
import {
  HiChevronDown,
  HiPlus,
  HiMinus,
  HiShoppingBag,
  HiStar,
  HiChevronRight,
  HiTag,
  HiClipboardCopy,
  HiBadgeCheck,
  HiHeart,
} from "react-icons/hi";
import Reviews from "@/components/Reviews";
import { MdLocalShipping } from "react-icons/md";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [api, setApi] = React.useState(null);
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [loadedImages, setLoadedImages] = React.useState(new Set());
  const [selected, setSelected] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [variationStock, setVariationStock] = useState(undefined);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [variantMatches, setVariantMatches] = useState([]);
  const [dropOne, setDropOne] = useState(false);
  const [dropTwo, setDropTwo] = useState(false);
  const [dropThree, setDropThree] = useState(false);
  const [dropFour, setDropFour] = useState(false);
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh");
    }
    return null;
  });
  const [isLiked, setIsLiked] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);

  // Format watcher count with "k" for thousands
  const formatWatchers = (count) => {
    if (count >= 1000) {
      const k = (count / 1000).toFixed(1);
      return k.endsWith('.0') ? `${k.slice(0, -2)}k` : `${k}k`;
    }
    return count.toString();
  };
  const [likeCount, setLikeCount] = useState(0);

  // Token refresh function
  async function refreshAccessToken() {
    // Always get the latest refresh token from localStorage
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

  React.useEffect(() => {
    if (!api) return;

    // Set initial values
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    // Update when user scrolls
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Preload and track loaded images
  React.useEffect(() => {
    if (!product?.images || !Array.isArray(product.images)) return;

    const currentIndex = current - 1; // Convert to 0-based index
    const imagesToPreload = [];

    // Preload current image and next 2 images
    for (let i = 0; i <= 2; i++) {
      const targetIndex = currentIndex + i;
      if (targetIndex < product.images.length && product.images[targetIndex]) {
        imagesToPreload.push({
          index: targetIndex,
          url: product.images[targetIndex],
        });
      }
    }

    // Preload images and track when they're loaded
    imagesToPreload.forEach(({ index, url }) => {
      if (url && !loadedImages.has(index)) {
        const img = new Image();
        const optimizedUrl = url;

        img.onload = () => {
          setLoadedImages((prev) => new Set([...prev, index]));
        };

        img.onerror = () => {
          // Still mark as "loaded" to prevent infinite retries
          setLoadedImages((prev) => new Set([...prev, index]));
        };

        img.src = optimizedUrl;
      }
    });
  }, [current, product?.images, loadedImages]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const headers = {};
        const currentToken = localStorage.getItem("access");
        if (currentToken) {
          headers.Authorization = `Bearer ${currentToken}`;
        }

        const res = await fetch(
          `http://127.0.0.1:8000/api/products/${params.id}/`,
          { headers }
        );
        if (!res.ok) throw new Error("Failed to fetch product");
        const data = await res.json();
        setProduct(data);
        setLikeCount(data.like_count || 0);
        setWatcherCount(data.like_count || 0);
        setIsLiked(data.is_liked || false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id, accessToken]);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!accessToken) return;
      
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/products/${params.id}/like/`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setIsLiked(data.liked);
          setLikeCount(data.like_count);
          setWatcherCount(data.like_count || 0);
        }
      } catch (err) {
        console.error("Failed to check like status:", err);
      }
    };

    checkLikeStatus();

    // Listen for favorites update events to refresh like status
    const handleFavoritesUpdate = () => {
      checkLikeStatus();
    };
    
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, [params.id, accessToken]);

  const handleLike = async () => {
    if (!accessToken) {
      router.push("/signin");
      return;
    }

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/products/${params.id}/like/`,
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
        setIsLiked(data.liked);
        setLikeCount(data.like_count);
        setWatcherCount(data.like_count || 0);
        
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
                product_id: params.id,
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
              const favorite = favorites.find((f) => f.product.id === parseInt(params.id));
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
        
        toast.success(data.liked ? "Product liked and added to favorites!" : "Product unliked and removed from favorites!", {
          style: {
            border: "1px solid #713200",
            padding: "16px",
            color: "#713200",
          },
          iconTheme: {
            primary: "#713200",
            secondary: "#FFFAEE",
          },
        });
      }
    } catch (err) {
      console.error("Failed to like product:", err);
      toast.error("Failed to like product", {
        style: {
          border: "1px solid #713200",
          padding: "16px",
          color: "#713200",
        },
        iconTheme: {
          primary: "#713200",
          secondary: "#FFFAEE",
        },
      });
    }
  };

  function priceRange(variants) {
    const prices = variants.map((variant) => variant.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice
      ? `₵${minPrice}`
      : `₵${minPrice} - ₵${maxPrice}`;
  }

  const handleVariantMatching = (currentSelected) => {
    const matches = product.variants.filter((variant) =>
      Object.entries(currentSelected).every(([k, v]) => variant[k] === v)
    );

    setVariantMatches(matches);
    console.log("variant match:", matches);
  };

  function handleSelectedVariants(key, value) {
    setSelectedVariants((prev) => {
      const updated = { ...prev, [key]: value };

      handleVariantMatching(updated);
      console.log("updated variants: ", updated);

      return updated;
    });
  }

  const maxStockLimit = (() => {
    if (variantMatches.length === 0) return undefined;

    if (variantMatches.length === 1) {
      return variantMatches[0].stock;
    }

    // If multiple variants match → sum stock
    return variantMatches.reduce((sum, v) => sum + (v.stock || 0), 0);
  })();

  async function addCart() {
    // Check if user is authenticated or guest
    if (!accessToken) {
      // Guest checkout - use localStorage cart
      if (variantMatches.length === 0) {
        toast.error("Please select product options", {
          style: {
            border: "1px solid #713200",
            padding: "16px",
            color: "#713200",
          },
          iconTheme: {
            primary: "#713200",
            secondary: "#FFFAEE",
          },
        });
        return;
      }

      toast.loading("Adding to bag.", {
        style: {
          border: "1px solid #713200",
          padding: "16px",
          color: "#713200",
        },
        iconTheme: {
          primary: "#713200",
          secondary: "#FFFAEE",
        },
      });

      try {
        // Import guest cart utilities
        const { addToGuestCart } = await import("@/utils/guestCart");
        
        // Add to guest cart
        const variant = variantMatches[0];
        addToGuestCart({
          id: variant.id,
          price: variant.price,
          product_id: product?.id,
          product_title: product?.title,
          product_images: product?.images || [],
          product: product
        }, quantity);

        toast.dismiss();
        toast.success("Added to bag.", {
          style: {
            border: "1px solid #713200",
            padding: "16px",
            color: "#713200",
          },
          iconTheme: {
            primary: "#713200",
            secondary: "#FFFAEE",
          },
        });
        
        // Trigger cart update event for navbar
        window.dispatchEvent(new Event('cartUpdated'));
        return Promise.resolve();
      } catch (error) {
        toast.dismiss();
        toast.error("Failed to add to bag.", {
          style: {
            border: "1px solid #713200",
            padding: "16px",
            color: "#713200",
          },
          iconTheme: {
            primary: "#713200",
            secondary: "#FFFAEE",
          },
        });
        return Promise.reject(error);
      }
    }

    // Authenticated user checkout - use API
    if (variantMatches.length === 0) {
      toast.error("Please select product options", {
        style: {
          border: "1px solid #713200",
          padding: "16px",
          color: "#713200",
        },
        iconTheme: {
          primary: "#713200",
          secondary: "#FFFAEE",
        },
      });
      return;
    }

    toast.loading("Adding to bag.", {
      style: {
        border: "1px solid #713200",
        padding: "16px",
        color: "#713200",
      },
      iconTheme: {
        primary: "#713200",
        secondary: "#FFFAEE",
      },
    });

    // Helper function to perform cart operations with token refresh on 401
    const performCartOperation = async (currentToken, retry = false) => {
    try {
      // First, fetch current cart
        let getCartRes = await fetch("http://127.0.0.1:8000/api/cart/", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

        // If 401 and not retrying, refresh token and retry
        if (getCartRes.status === 401 && !retry) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            return performCartOperation(newToken, true);
          } else {
            toast.dismiss();
            toast.error("Session expired. Please sign in again.", {
              style: {
                border: "1px solid #713200",
                padding: "16px",
                color: "#713200",
              },
              iconTheme: {
                primary: "#713200",
                secondary: "#FFFAEE",
              },
            });
            router.push("/signin");
            return;
          }
        }

        if (!getCartRes.ok) {
          const errorText = await getCartRes.text();
          let errorData = {};
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText || "Failed to fetch cart" };
          }
          throw new Error(errorData.error || errorData.detail || errorData.message || "Failed to fetch cart");
        }

      let existingItems = [];
      let cartExists = false;
      let cartId = null;
      let cart = null;
      
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

      // Check if variant already exists in cart
      const existingItemIndex = existingItems.findIndex(
        (item) => item.variant_id === variantMatches[0].id
      );

      if (existingItemIndex >= 0) {
        // Update quantity of existing item
        existingItems[existingItemIndex].quantity += quantity;
      } else {
        // Add new item (don't include id for new items)
        existingItems.push({
          variant_id: variantMatches[0].id,
          quantity: quantity,
        });
      }

      // Determine method: POST if no cart exists, PUT if cart exists
      let response;
      if (cartExists && cartId) {
        // Use PUT with cart ID
        response = await fetch(`http://127.0.0.1:8000/api/cart/${cartId}/`, {
          method: "PUT",
          headers: {
              Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: existingItems,
          }),
        });
      } else {
        // Use POST to create new cart
        response = await fetch("http://127.0.0.1:8000/api/cart/", {
          method: "POST",
          headers: {
              Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: existingItems,
          }),
        });
      }

        // If 401 and not retrying, refresh token and retry
        if (response.status === 401 && !retry) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            return performCartOperation(newToken, true);
          } else {
            toast.dismiss();
            toast.error("Session expired. Please sign in again.", {
              style: {
                border: "1px solid #713200",
                padding: "16px",
                color: "#713200",
              },
              iconTheme: {
                primary: "#713200",
                secondary: "#FFFAEE",
              },
            });
            router.push("/signin");
            return;
          }
        }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || "Failed to add to cart" };
        }
        throw new Error(errorData.error || errorData.detail || errorData.message || "Failed to add to cart");
      }

        return true;
      } catch (error) {
        throw error;
      }
    };

    try {
      await performCartOperation(accessToken);

      toast.dismiss();
      toast.success("Added to bag.", {
        style: {
          border: "1px solid #713200",
          padding: "16px",
          color: "#713200",
        },
        iconTheme: {
          primary: "#713200",
          secondary: "#FFFAEE",
        },
      });
      // Trigger cart update event for navbar
      window.dispatchEvent(new Event('cartUpdated'));
      return Promise.resolve();
    } catch (error) {
      console.error(error);
          toast.dismiss();
      toast.error(error.message || "Failed to add to bag.", {
        style: {
          border: "1px solid #713200",
          padding: "16px",
          color: "#713200",
        },
        iconTheme: {
          primary: "#713200",
          secondary: "#FFFAEE",
        },
      });
      return Promise.reject(error);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="w-full h-auto">
      <div className="px-2 md:px-5 lg:px-20 pt-4">
        <Breadcrumbs
          items={[
            { label: "Products", href: "/products" },
            { label: product?.title || "Product", href: null },
          ]}
        />
      </div>
      <div className="w-full h-auto flex flex-col lg:flex-row-reverse lg:px-20 lg:justify-between lg:gap-10">
      <div className="relative">
        <Carousel className="w-full  " setApi={setApi}>
          <CarouselContent className="">
            {product.images &&
            Array.isArray(product.images) &&
            product.images.length > 0 ? (
              product.images.map((p, index) => {
                const isFirstImage = index === 0;
                const isImageLoaded = loadedImages.has(index) || isFirstImage;
                const optimizedUrl = p.image;
                return (
                  <CarouselItem key={index}>
                    {isImageLoaded ? (
                      <NextImage
                        src={optimizedUrl}
                        alt={product.title}
                        className="h-[60vh] object-cover lg:rounded-md"
                        priority={isFirstImage}
                        width={1000}
                        height={675}
                        sizes="100vw max-w-full lg:max-w-[60vw]"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="mb-2 w-full h-[60vh] bg-gray-800/50 flex items-center justify-center"
                        style={{ aspectRatio: "16/9" }}
                      >
                        <div className="text-white/50 text-sm">
                          Loading image...
                        </div>
                      </div>
                    )}
                  </CarouselItem>
                );
              })
            ) : (
              <CarouselItem>
                <div
                  className="mb-2 w-full h-[60vh] bg-gray-800/50 flex items-center justify-center"
                  style={{ aspectRatio: "16/9" }}
                >
                  <div className="text-white/50 text-sm">
                    No images available
                  </div>
                </div>
              </CarouselItem>
            )}
          </CarouselContent>
          {product.images && product.images.length > 1 && (
            <>
              <CarouselPrevious className="hidden lg:block absolute top-1/2 left-2 lg:left-10 -translate-y-1/2 bg-black/15 hover:bg-white/50 text-white rounded-full p-2 border-0">
                ‹
              </CarouselPrevious>
              <CarouselNext className="hidden lg:block absolute top-1/2 right-2 lg:right-10 -translate-y-1/2 bg-black/15 hover:bg-white/50 text-white rounded-full p-2 border-0">
                ›
              </CarouselNext>
            </>
          )}
          {/* pagination dots!!! Work on this later */}
          <div className="absolute bottom-5  lg:right-10 bg-black/15 backdrop-blur-sm px-3 py-1 rounded-3xl text-sm text-white">
            {current} / {count}
          </div>
        </Carousel>
        {/* Watchlist button on image */}
        <button
          onClick={handleLike}
          aria-label={`Add to watchlist - ${watcherCount} watchers`}
          className="x-watch-heart-btn icon-btn absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all duration-300 z-10 hover:scale-105"
          data-ebayui=""
          type="button"
        >
          <HiHeart
            size={18}
            fill={isLiked ? "#FF6B9D" : "none"}
            stroke="#FF6B9D"
            strokeWidth={2}
            className="transition-all duration-300"
          />
          <span className="text-sm font-medium text-gray-900">{formatWatchers(watcherCount)}</span>
        </button>
        <div className="hidden lg:flex gap-2 my-2 lg:max-w-[60vw] overflow-x-auto scrollbar-hide">
          {product.images &&
            product.images.length > 1 &&
            product.images.map((p, index) => (
              <button
                key={index}
                onMouseEnter={() => api?.scrollTo(index)}
                onTouchStart={() => api?.scrollTo(index)}
              >
                <NextImage
                  src={p.image}
                  alt={`Thumbnail ${index + 1}`}
                  width={60}
                  height={60}
                  className={`object-cover w-50 h-40 rounded-sm border-2 ${
                    current - 1 === index
                      ? "border-[#FF6B9D]"
                      : "border-gray-300"
                  }`}
                  unoptimized
                />
              </button>
            ))}
        </div>
        
        {/* Reviews Section - Desktop only, under image */}
        {product && (
          <div className="hidden lg:block w-full lg:max-w-[60vw] mt-6">
            <Reviews
              productId={product.id}
              canReview={product.can_review || false}
              onReviewSubmitted={() => {
                // Refresh product data to update can_review status
                fetch(`http://127.0.0.1:8000/api/products/${params.id}/`)
                  .then((res) => res.json())
                  .then((data) => {
                    setProduct(data);
                  })
                  .catch((err) => console.error("Error refreshing product:", err));
              }}
            />
          </div>
        )}
      </div>
      <div className="relative px-2 py-10 lg:px-4 lg:pt-0 lg:pb-40 lg:max-w-[40vw] lg:h-screen overflow-y-scroll scrollbar-hide">
        <div className="lg:hidden absolute right-0 left-0 top-0 w-full py-1 px-2 bg-[#FF6B9D] text-sm text-white text-semibold">
          Free Delivery for orders in Accra.
        </div>
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-black text-base font-semibold flex-1">
          {
              <span className="bg-[#FF6B9D] rounded-tl-xl rounded-br-xl py-1 px-2 text-sm text-white font-medium mr-2">
              Free Delivery
            </span>
          }
          {product.title}
        </h1>
        </div>
        <p className="text-gray-600 mb-2">{product.description}</p>
        {/* Average Rating */}
        {product.average_rating > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <HiStar size={18} className="text-yellow-400 fill-yellow-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {product.average_rating}
              </span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ({product.review_count} {product.review_count === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <p className="text-2xl font-bold mb-2 text-[#FF6B9D]">
            <span className="text-sm">GH₵</span>
            {variantMatches.length > 0
              ? priceRange(variantMatches)
              : product.base_price}
          </p>
          {maxStockLimit !== undefined && maxStockLimit <= 10 && (
            <div className="text-sm border border-[#FF6B9D] rounded-sm p-1 text-[#FF6B9D] h-fit font-semibold">
              only {maxStockLimit} left
        </div>
          )}
        </div>
        <div className="bg-[#FF6B9D]/10 rounded-md py-1 pl-2 pr-6 w-full text-sm flex gap-2 items-center relative mb-2">
          <div className="flex gap-1 bg-[#FF6B9D] py-1 px-1.5 rounded-sm">
            <HiStar size={16} className="text-white" />
            <span className="text-white font-semibold">#1 Best Seller</span>
          </div>
          <span
            className="whitespace-nowrap 
                overflow-hidden 
                text-ellipsis 
                max-w-[230px] 
                sm:max-w-[200px] 
                lg:max-w-[300px]
                "
          >
            in Body Wave Synthetic Woven Wigs
          </span>
          <HiChevronRight size={16} className="absolute right-2" />
        </div>
        <div className="bg-[#FF6B9D]/10 rounded-md py-2 pl-2 pr-6 w-full text-xs flex gap-2 items-center relative mb-2">
          <HiTag size={16} className="text-[#FF6B9D]" />
          <span
            className="whitespace-nowrap 
                overflow-hidden 
                text-ellipsis 
                max-w-[400px] 
                sm:max-w-[400px] 
                lg:max-w-[300px]
                "
          >
            Get 10% off your first order! Use code: WELCOME10
          </span>
          <HiClipboardCopy size={16} className="absolute right-2 text-[#FF6B9D]" />
        </div>
        {/* DYNAMIC VARIANT SYSTEM */}
        {(() => {
          const ignored = ["id", "price", "stock"];
          const variantKeys = Object.keys(product.variants[0]).filter(
            (key) =>
              !ignored.includes(key) &&
              product.variants.some((v) => v[key] !== null)
          );

          const variantOptions = {};
          variantKeys.forEach((key) => {
            variantOptions[key] = [
              ...new Set(product.variants.map((v) => v[key]).filter(Boolean)),
            ];
          });

          const getValidOptions = (key) => {
            const other = { ...selected };
            delete other[key];

            return product.variants
              .filter((variant) =>
                Object.entries(other).every(([k, v]) =>
                  v ? variant[k] === v : true
                )
              )
              .map((v) => v[key]);
          };

          return (
            <div className="mt-0">
              {variantKeys.map((key) => {
                const valid = getValidOptions(key);

                return (
                  <div key={key} className="mb-2">
                    <p className="text-base font-semibold capitalize mb-1">
                      {key.replace(/_/g, " ")}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {variantOptions[key].map((value) => {
                        const matchesStock = product.variants.some(
                          (v) => v[key] === value && v.stock > 0
                        );
                        const available = valid.includes(value) && matchesStock;
                        const isSelected = selected[key] === value;

                        return (
                          <button
                            key={value}
                            onClick={() => {
                              available &&
                                setSelected((prev) => ({
                                  ...prev,
                                  [key]: value,
                                }));
                              handleSelectedVariants(key, value);
                            }}
                            className={`
                              border py-2 px-3 rounded-md text-sm w-fit transition
                              ${isSelected ? "border-[#FF6B9D] bg-[#FF6B9D]/10 text-[#FF6B9D] font-semibold" : "border-gray-300"}
                              ${available ? "hover:border-[#FF6B9D]" : "text-gray-300 opacity-40 cursor-not-allowed"}
                            `}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
        <div className="flex justify-between items-center mb-2">
          <p className="font-bold text-sm">Qty</p>{" "}
          <div className="border border-gray-300 flex items-center gap-4 py-2 px-3 rounded-md text-sm w-fit">
            <button
              disabled={quantity <= 1}
              onClick={() => quantity > 1 && setQuantity((prev) => prev - 1)}
              className={quantity <= 1 ? "opacity-30 cursor-not-allowed" : ""}
            >
              <HiMinus size={14} className="text-gray-600" />
            </button>
            <span className="font-bold">
              {variationStock === undefined ? quantity : variationStock}
            </span>

            <button
              disabled={
                maxStockLimit !== undefined && quantity >= maxStockLimit
              }
              onClick={() =>
                maxStockLimit === undefined || quantity < maxStockLimit
                  ? setQuantity((q) => q + 1)
                  : null
              }
              className={
                maxStockLimit !== undefined && quantity >= maxStockLimit
                  ? "opacity-30 cursor-not-allowed"
                  : ""
              }
            >
              <HiPlus size={14} className="text-gray-600" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:gap-4 mb-3">
          <button 
            onClick={(e) => {
              e.preventDefault();
              addCart();
            }}
            className="py-3 px-4 border-2 border-[#FF6B9D] w-full text-base rounded-lg font-bold text-[#FF6B9D] hover:bg-[#FF6B9D]/10 transition"
          >
            Add to bag
          </button>
          <button
            onClick={async (e) => {
              e.preventDefault();
              if (variantMatches.length === 0) {
                toast.error("Please select product options", {
                  style: {
                    border: "1px solid #713200",
                    padding: "16px",
                    color: "#713200",
                  },
                  iconTheme: {
                    primary: "#713200",
                    secondary: "#FFFAEE",
                  },
                });
                return;
              }
              // Add to cart and redirect directly to checkout
              try {
                await addCart();
                router.push("/checkout");
              } catch (error) {
                // Error already handled in addCart
              }
            }}
            className="py-3 px-4 bg-[#FF6B9D] w-full text-base rounded-lg font-bold text-white hover:bg-[#FF5A8A] transition shadow-lg"
          >
            Buy now
          </button>
        </div>
        <div className="text-xs text-gray-400 flex gap-2 items-center">
          <span>Secure Momo & Card Payments.</span>{" "}
          <div className="rounded-xs h-4 w-fit">
            <NextImage
              src="/payment-icons/mtn.svg"
              alt="mtn"
              width={64}
              height={40}
              className="w-full h-full object-cover  border-b border-r  border-gray-100/80"
            />
          </div>
          <div className="rounded-xs h-4 w-fit">
            <NextImage
              src="/payment-icons/telecel.svg"
              alt="telecel"
              width={64}
              height={40}
              className="w-full h-full object-cover border-b border-r border-gray-100/80"
            />
          </div>
          <div className="rounded-xs h-4 w-fit">
            <NextImage
              src="/payment-icons/airteltigo.svg"
              alt="airteltigo"
              width={64}
              height={40}
              className="w-full h-full object-cover  border-b border-r border-gray-100/80"
            />
          </div>
          <div className="rounded-xs h-4 w-fit">
            <NextImage
              src="/payment-icons/visa.svg"
              alt="visa"
              width={64}
              height={40}
              className="w-full h-full object-cover border-b border-r border-gray-100/80"
            />
          </div>
          <div className="rounded-xs h-4 w-fit">
            <NextImage
              src="/payment-icons/mastercard.svg"
              alt="mastercard"
              width={64}
              height={40}
              className="w-full h-full object-cover border-b border-r border-gray-100/80"
            />
          </div>
        </div>
        <div className="bg-[#FF6B9D]/10 p-3 flex flex-col lg:flex-row gap-3 text-xs my-2 rounded-md">
          <div className="flex gap-2 items-center">
            <HiShoppingBag size={16} className="text-[#FF6B9D]" />{" "}
            <span className="font-medium">Nationwide Delivery</span>
          </div>
          <div className="flex gap-2 items-center">
            <MdLocalShipping size={16} className="text-[#FF6B9D]" />{" "}
            <span className="font-medium">International Shipping</span>
          </div>
          <div className="flex gap-2 items-center">
            <HiBadgeCheck size={16} className="text-[#FF6B9D]" />{" "}
            <span className="font-medium">Top Quality</span>
          </div>
        </div>
        <div>
          <div className="border-b border-b-black/10 py-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">What you would like</label>
              <button onClick={() => setDropOne((prev) => !prev)}>
                {dropOne ? <HiMinus size={14} /> : <HiPlus size={14} />}
              </button>
            </div>
            {dropOne ? (
              <ul className="text-xs list-disc list-inside mt-2 space-y-1">
                <li>
                  <span className="font-semibold">
                    Effortless Curtain Bang Glam
                  </span>{" "}
                  --Soft curtain bangs with bouncy 3D waves naturally frame the
                  face, creating a polished look that lasts all day.
                </li>
                <li>
                  <span className="font-semibold">Ready for Every Moment</span>{" "}
                  --From work to weekends or nights out, this wig adapts easily
                  to any occasion while maintaining a stylish appearance.
                </li>
                <li>
                  <span className="font-semibold">
                    Own the Look, Own the Power
                  </span>{" "}
                  --Designed to highlight personal style, conveying boldness,
                  elegance, and effortless confidence.
                </li>
                <li>
                  <span className="font-semibold">All-Day Comfort</span>{" "}
                  --Lightweight, breathable, and securely fitted, providing
                  comfort and freedom of movement from morning to night.
                </li>
              </ul>
            ) : null}
          </div>
          <div className="border-b border-b-black/10 py-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">Product Details</label>
              <button onClick={() => setDropTwo((prev) => !prev)}>
                {dropTwo ? <HiMinus size={14} /> : <HiPlus size={14} />}
              </button>
            </div>
            {dropTwo ? (
              <div className="text-xs list-disc list-inside mt-2 space-y-1">
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Hair Texture</span>
                  <span>Body Wave Wigs</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Hair Type</span>
                  <span>Synthetic Wigs</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Cap Construction</span>
                  <span>Half Hand-Tied Cap</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Hair Length</span>
                  <span>14 Inches</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Hair Density</span>
                  <span>150% Density</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Hair Color</span>
                  <span>Natural Black (#1B)</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Parting Style</span>
                  <span>Curtain Bangs with Middle Part</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Adjustable Straps</span>
                  <span>Yes</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Combs</span>
                  <span>2 Side Combs, 1 Back Comb</span>
                </p>
                <p className="grid grid-cols-[30%_70%]">
                  <span className="font-medium">Heat Resistant</span>
                  <span>No</span>
                </p>
              </div>
            ) : null}
          </div>
          <div className="border-b border-b-black/10 py-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">Shipping & Returns</label>
              <button onClick={() => setDropThree((prev) => !prev)}>
                {dropThree ? <HiMinus size={14} /> : <HiPlus size={14} />}
              </button>
            </div>
            {dropThree ? (
              <div className="text-xs list-disc list-inside mt-2 space-y-1">
                <p>
                  Free delivery on all orders within Accra. Orders are typically
                  delivered within 2-4 business days.
                </p>
                <p>
                  We offer international shipping to select countries. Shipping
                  fees and delivery times vary based on location.
                </p>
                <p>
                  If you are not completely satisfied with your purchase, you
                  may return the item(s) within 14 days of receipt for a full
                  refund or exchange. The item(s) must be in original condition
                  and packaging.
                </p>
              </div>
            ) : null}
          </div>
          <div className="border-b border-b-black/10 py-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium">Care Instructions</label>
              <button onClick={() => setDropFour((prev) => !prev)}>
                {dropFour ? <HiMinus size={14} /> : <HiPlus size={14} />}
              </button>
            </div>
            {dropFour ? (
              <div className="text-xs list-disc list-inside mt-2 space-y-1">
                <p>
                  Gently detangle the wig using a wide-tooth comb or your
                  fingers before washing.
                </p>
                <p>
                  Fill a basin with cool water and add a small amount of mild
                  shampoo. Submerge the wig and gently swish it around. Avoid
                  rubbing or twisting the hair.
                </p>
                <p>
                  Rinse the wig thoroughly with cool water to remove all
                  shampoo. Apply a small amount of conditioner, avoiding the
                  roots, and rinse again.
                </p>
                <p>
                  Pat the wig dry with a towel to remove excess water. Place it
                  on a wig stand to air dry completely. Avoid using heat tools.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed w-full bottom-0 flex flex-col gap-2 bg-white backdrop-blur-sm border-t border-gray-300/20 px-2 lg:px-40 py-4 shadow-lg">
        <div className="flex justify-between">
          <span></span>
          <span className="text-lg text-[#FF6B9D] font-bold">
            <span className=" text-xs lg:text-sm">GH₵</span>
            {variantMatches.length > 0
              ? priceRange(variantMatches)
              : product.base_price}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="border-2 border-[#FF6B9D] py-2 rounded-lg font-bold text-[#FF6B9D]"
            onClick={(e) => {
              e.preventDefault();
              if (!accessToken) {
                router.push("/signin");
                return;
              }
              if (variantMatches.length === 0) {
                toast.error("Please select product options", {
                  style: {
                    border: "1px solid #713200",
                    padding: "16px",
                    color: "#713200",
                  },
                  iconTheme: {
                    primary: "#713200",
                    secondary: "#FFFAEE",
                  },
                });
                return;
              }
              addCart();
            }}
          >
            Add to bag
          </button>
          <button
            onClick={async (e) => {
              e.preventDefault();
              if (variantMatches.length === 0) {
                toast.error("Please select product options", {
                  style: {
                    border: "1px solid #713200",
                    padding: "16px",
                    color: "#713200",
                  },
                  iconTheme: {
                    primary: "#713200",
                    secondary: "#FFFAEE",
                  },
                });
                return;
              }
              // Add to cart and redirect directly to checkout
              try {
                await addCart();
                router.push("/checkout");
              } catch (error) {
                // Error already handled in addCart
              }
            }}
            className="bg-[#FF6B9D] py-2 rounded-lg text-white font-bold hover:bg-[#FF5A8A] transition"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Reviews Section - Mobile/Tablet only */}
      {product && (
        <div className="w-full px-2 lg:hidden py-8">
          <Reviews
            productId={product.id}
            canReview={product.can_review || false}
            onReviewSubmitted={async () => {
              // Refresh product data to update can_review status
              try {
                const headers = {};
                const currentToken = localStorage.getItem("access");
                if (currentToken) {
                  headers.Authorization = `Bearer ${currentToken}`;
                }
                const res = await fetch(`http://127.0.0.1:8000/api/products/${params.id}/`, { headers });
                const data = await res.json();
                  setProduct(data);
              } catch (err) {
                console.error("Error refreshing product:", err);
              }
            }}
          />
        </div>
      )}
      </div>
    </div>
  );
}
