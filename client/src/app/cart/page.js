"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { HiPlus, HiMinus, HiTrash, HiShoppingBag } from "react-icons/hi";
import toast from "react-hot-toast";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getGuestCart, updateGuestCartQuantity, removeFromGuestCart } from "@/utils/guestCart";

export default function Page() {
  const router = useRouter();
  const [cart, setCart] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState("");
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  const [refreshToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("refresh");
    }
    return null;
  });

  async function refreshAccessToken() {
    if (!refreshToken) return null;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
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

  async function fetchCartItems(token) {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cart/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          setError("Session expired. Please log in again.");
          return;
        }
        return fetchCartItems(newToken);
      }

      if (!res.ok) throw new Error("Failed to fetch cart");

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setCart(data[0]);
      } else if (data.items) {
        setCart(data);
      } else {
        setCart(null);
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function fetchProducts() {
    fetch("http://127.0.0.1:8000/api/products/")
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => {});
  }

  async function validateDiscountCode() {
    if (!discountCode.trim() || !cart) {
      return;
    }

    setValidatingDiscount(true);
    setDiscountError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/discount-code/validate/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          cart_total: cart.total_price || 0,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAppliedDiscount(data);
        toast.success("Discount code applied!");
        setDiscountError("");
      } else {
        setAppliedDiscount(null);
        setDiscountError(data.error || "Invalid discount code");
        toast.error(data.error || "Invalid discount code");
      }
    } catch (error) {
      setAppliedDiscount(null);
      setDiscountError("Failed to validate discount code");
      toast.error("Failed to validate discount code");
    } finally {
      setValidatingDiscount(false);
    }
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
    toast.success("Discount code removed");
  }

  function calculateTotal() {
    if (!cart) return 0;
    let total = cart.total_price || 0;
    if (appliedDiscount) {
      total -= parseFloat(appliedDiscount.discount_amount || 0);
    }
    return Math.max(0, total);
  }

  function loadGuestCart() {
    try {
      const guestCart = getGuestCart();
      if (guestCart && guestCart.items && guestCart.items.length > 0) {
        // Transform guest cart to match API cart structure
        setCart({
          items: guestCart.items.map(item => ({
            id: item.variant_id || item.variant?.id,
            variant: item.variant || {
              id: item.variant_id,
              price: item.price,
              product: item.variant?.product || {
                id: item.product_id,
                title: item.product_title,
                images: item.product_images || []
              }
            },
            quantity: item.quantity || 1
          })),
          total_price: guestCart.total_price || 0
        });
        setLoading(false);
      } else {
        setCart(null);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading guest cart:", error);
      setCart(null);
      setLoading(false);
    }
  }

  useEffect(() => {
    setIsGuest(!accessToken);
    
    if (accessToken) {
      fetchCartItems(accessToken);
    } else {
      loadGuestCart();
    }
    fetchProducts();
    
    // Listen for cart update events
    const handleCartUpdate = () => {
      if (accessToken) {
        fetchCartItems(accessToken);
      } else {
        loadGuestCart();
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [accessToken]);

  function getProductAndVariant(cartItem) {
    if (!cartItem || !cartItem.variant) return { product: null, variant: null };

    const variantId = cartItem.variant.id;

    const product = products.find((p) =>
      p.variants.some((v) => v.id == variantId)
    );

    if (!product) {
      return { product: null, variant: null };
    }

    const variant = product.variants.find((v) => v.id == variantId);

    return { product, variant };
  }

  async function updateCartItemQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
      removeCartItem(itemId);
      return;
    }

    setUpdating({ ...updating, [itemId]: true });

    try {
      // Guest cart update
      if (isGuest) {
        const variantId = cart.items.find(item => item.id === itemId || item.variant?.id === itemId)?.variant?.id || itemId;
        updateGuestCartQuantity(variantId, newQuantity);
        loadGuestCart();
        toast.success("Cart updated");
        window.dispatchEvent(new Event('cartUpdated'));
        setUpdating({ ...updating, [itemId]: false });
        return;
      }

      // Authenticated cart update
      const updatedItems = cart.items.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );

      if (!cart || !cart.id) {
        toast.error("Cart not found");
        setUpdating({ ...updating, [itemId]: false });
        return;
      }

      const res = await fetch(`http://127.0.0.1:8000/api/cart/${cart.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: updatedItems.map((item) => ({
            id: item.id,
            variant_id: item.variant.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCart(data[0]);
        } else {
          setCart(data);
        }
        toast.success("Cart updated");
        // Trigger cart update event for navbar
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        const errorText = await res.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || "Failed to update cart" };
        }
        toast.error(errorData.error || errorData.detail || "Failed to update cart");
      }
    } catch (error) {
      toast.error("Error updating cart");
    } finally {
      setUpdating({ ...updating, [itemId]: false });
    }
  }

  async function removeCartItem(itemId) {
    setUpdating({ ...updating, [itemId]: true });

    try {
      // Guest cart removal
      if (isGuest) {
        const item = cart.items.find(item => item.id === itemId || item.variant?.id === itemId);
        if (item) {
          const variantId = item.variant?.id || item.variant_id || itemId;
          removeFromGuestCart(variantId);
          loadGuestCart();
          toast.success("Item removed");
          window.dispatchEvent(new Event('cartUpdated'));
          setUpdating({ ...updating, [itemId]: false });
          return;
        }
      }

      // Authenticated cart removal
      if (!cart || !cart.id) {
        toast.error("Cart not found");
        setUpdating({ ...updating, [itemId]: false });
        return;
      }

      const updatedItems = cart.items.filter((item) => item.id !== itemId);

      // Use cart ID in the URL
      const res = await fetch(`http://127.0.0.1:8000/api/cart/${cart.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: updatedItems.map((item) => ({
            id: item.id,
            variant_id: item.variant.id,
            quantity: item.quantity,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCart(data[0]);
        } else {
          setCart(data);
        }
        toast.success("Item removed");
        // Trigger cart update event for navbar
        window.dispatchEvent(new Event('cartUpdated'));
      } else {
        const errorText = await res.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || "Failed to remove item" };
        }
        toast.error(errorData.error || errorData.detail || "Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Error removing item");
    } finally {
      setUpdating({ ...updating, [itemId]: false });
    }
  }

  return (
    <main className="h-auto w-screen flex flex-col justify-center px-5 lg:px-40 pb-20">
        <Breadcrumbs
          items={[
            { label: "Cart", href: "/cart" },
          ]}
        />
        <h1 className="text-xl lg:text-2xl font-bold mb-6">Your Cart</h1>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && (!cart || !cart.items || cart.items.length === 0) && (
          <div className="text-center py-12">
            <HiShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-base lg:text-lg text-gray-600 mb-4">Your cart is empty</p>
            <Link
              href="/products"
              className="text-[#FF6B9D] hover:underline font-semibold"
            >
              Continue Shopping
            </Link>
          </div>
        )}

        {!loading && cart && cart.items && cart.items.length > 0 && (
          <div className="lg:grid grid-cols-[65%_35%] gap-8 lg:px-20 px-2">
            <ul className="space-y-4">
              {cart.items.map((item) => {
              const { product, variant } = getProductAndVariant(item);

                if (!product || !variant) {
                return (
                    <li key={item.id} className="mb-4 text-red-500 text-base">
                      Product not found
                  </li>
                );
              }

                const isUpdating = updating[item.id];

                return (
                  <li
                    key={item.id}
                    className="border border-gray-200 rounded-md p-4 flex gap-4"
                  >
                    <Link href={`/products/${product.id}`}>
                    <Image
                        src={
                          product.images?.[0]?.image || "/placeholder.jpg"
                        }
                        width={120}
                        height={120}
                      alt={product.title}
                        className="w-24 h-24 object-cover rounded-md border border-gray-300"
                      unoptimized
                    />
                    </Link>
                    <div className="flex flex-col justify-between flex-1">
                      <div>
                        <Link href={`/products/${product.id}`}>
                          <p className="font-medium text-sm hover:underline">
                            {product.title}
                          </p>
                        </Link>
                        <div className="border border-gray-200 rounded-md p-2 text-sm my-2 inline-block">
                          <p>
                            {variant.length && `${variant.length} / `}
                            {variant.color && `${variant.color} / `}
                      {variant.texture}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-base">
                          <span className="text-sm">GH₵</span>
                          {variant.price}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="border border-gray-200 flex items-center gap-3 py-1 px-2 rounded-md text-sm">
            <button
                              disabled={isUpdating || item.quantity <= 1}
                              onClick={() =>
                                updateCartItemQuantity(item.id, item.quantity - 1)
                              }
                              className={
                                item.quantity <= 1 || isUpdating
                                  ? "opacity-30 cursor-not-allowed"
                                  : ""
                              }
            >
                              <HiMinus size={14} className="text-gray-600" />
            </button>
                            <span className="font-bold min-w-[2rem] text-center">
                              {item.quantity}
            </span>
            <button
              disabled={
                                isUpdating || item.quantity >= variant.stock
              }
              onClick={() =>
                                updateCartItemQuantity(item.id, item.quantity + 1)
              }
              className={
                                item.quantity >= variant.stock || isUpdating
                  ? "opacity-30 cursor-not-allowed"
                  : ""
              }
            >
                              <HiPlus size={14} className="text-gray-600" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeCartItem(item.id)}
                            disabled={isUpdating}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            <HiTrash size={18} />
            </button>
                        </div>
                      </div>
                  </div>
                </li>
              );
            })}
          </ul>
            <div className="border border-gray-200 rounded-md p-6 h-fit mt-10 lg:mt-0">
              <h2 className="text-lg lg:text-xl font-semibold mb-4">Order Summary</h2>
            {!appliedDiscount ? (
              <div className="mb-4">
                <div className="flex gap-2">
                <input
                  type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === "Enter" && validateDiscountCode()}
                  placeholder="Enter discount code"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm dark:bg-gray-700 dark:text-white"
                />
                  <button
                    onClick={validateDiscountCode}
                    disabled={validatingDiscount || !discountCode.trim()}
                    className="border border-gray-200 dark:border-gray-600 py-2 px-3 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validatingDiscount ? "..." : "Apply"}
                  </button>
                </div>
                {discountError && (
                  <p className="text-red-500 text-xs mt-1">{discountError}</p>
                )}
              </div>
            ) : (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                      {appliedDiscount.code} Applied
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {appliedDiscount.discount_type === "percentage" 
                        ? `${appliedDiscount.discount_value}% off`
                        : `₵${appliedDiscount.discount_value} off`}
                    </p>
                  </div>
                  <button
                    onClick={removeDiscount}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold"
                  >
                    Remove
                </button>
                </div>
              </div>
            )}
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between text-gray-900 dark:text-white">
              <span>Subtotal</span>
                  <span>₵{cart.total_price?.toFixed(2) || "0.00"}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount ({appliedDiscount.code})</span>
                    <span>-₵{parseFloat(appliedDiscount.discount_amount || 0).toFixed(2)}</span>
            </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Shipping</span>
                  <span className="text-gray-500 dark:text-gray-500">Calculated at checkout</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>₵{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
              <Link href="/checkout" onClick={(e) => {
                if (appliedDiscount) {
                  sessionStorage.setItem('discountCode', appliedDiscount.code);
                }
              }}>
                <button className="bg-[#FF6B9D] rounded-md w-full py-3 font-bold text-white mt-6 hover:bg-[#FF5A8A]">
                  Proceed to Checkout
                </button>
              </Link>
            </div>
            </div>  
        )}
      </main>
  );
}
