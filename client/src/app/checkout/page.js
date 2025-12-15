"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiPlus, HiMinus, HiLocationMarker, HiTruck } from "react-icons/hi";
import { clearGuestCart, getGuestCart } from "@/utils/guestCart";

export default function CheckoutPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState([]);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [cart, setCart] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: "",
    phone_number: "",
    address_line: "",
    city: "",
    region: "",
    is_default: false,
  });

  // Guest checkout fields
  const [isGuest, setIsGuest] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    email: "",
    name: "",
  });

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    setIsGuest(!accessToken);
    fetchShippingMethods();
    if (accessToken) {
      fetchCart();
      fetchAddresses();
    } else {
      // For guest checkout, load cart from localStorage or session
      loadGuestCart();
      setLoading(false);
    }
  }, [accessToken]);

  async function fetchCart() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cart/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCart(data[0]);
        } else if (data.items) {
          setCart(data);
        }
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAddresses() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/addresses/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        const defaultAddress = data.find((addr) => addr.is_default);
        if (defaultAddress) {
          setSelectedAddress(defaultAddress.id);
        } else if (data.length > 0) {
          setSelectedAddress(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  }

  async function fetchShippingMethods() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/shipping-methods/");
      if (res.ok) {
        const data = await res.json();
        setShippingMethods(data);
        if (data.length > 0) {
          setSelectedShipping(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
    }
  }

  async function createAddress() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/addresses/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(newAddress),
      });

      if (res.ok) {
        const data = await res.json();
        setAddresses([...addresses, data]);
        setSelectedAddress(data.id);
        setShowNewAddress(false);
        setNewAddress({
          full_name: "",
          phone_number: "",
          address_line: "",
          city: "",
          region: "",
          is_default: false,
        });
        toast.success("Address added successfully");
      } else {
        toast.error("Failed to add address");
      }
    } catch (error) {
      toast.error("Error adding address");
    }
  }

  async function loadGuestCart() {
    try {
      const guestCart = getGuestCart();
      if (guestCart && guestCart.items && guestCart.items.length > 0) {
        setCart(guestCart);
      } else {
        setCart(null);
      }
    } catch (e) {
      console.error("Error loading guest cart:", e);
      setCart(null);
    }
  }

  async function handleCheckout() {
    if (isGuest) {
      // Guest checkout validation
      if (!guestInfo.email || !guestInfo.name) {
        toast.error("Please enter your email and name");
        return;
      }
      if (!newAddress.full_name || !newAddress.phone_number || !newAddress.address_line || !newAddress.city || !newAddress.region) {
        toast.error("Please fill in all address fields");
        return;
      }
      if (!selectedShipping) {
        toast.error("Please select a shipping method");
        return;
      }
      if (!cart || !cart.items || cart.items.length === 0) {
        toast.error("Your cart is empty");
        return;
      }
    } else {
      // Authenticated checkout validation
    if (!selectedAddress || !selectedShipping) {
      toast.error("Please select an address and shipping method");
      return;
    }
    if (!cart || !cart.items || cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
      }
    }

    setProcessing(true);
    toast.loading("Processing order...");

    // Get discount code from sessionStorage if it exists
    const discountCode = sessionStorage.getItem('discountCode');

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const body = isGuest ? {
        guest_email: guestInfo.email,
        guest_name: guestInfo.name,
        guest_address: {
          full_name: newAddress.full_name,
          phone_number: newAddress.phone_number,
          address_line: newAddress.address_line,
          city: newAddress.city,
          region: newAddress.region,
          country: "Ghana",
        },
        shipping_method_id: selectedShipping,
        discount_code: discountCode || null,
        cart_items: (cart.items || []).map(item => {
          // Handle both nested variant object and direct variant_id
          const variantId = item.variant?.id || item.variant_id || item.variant;
          return {
            variant_id: variantId,
            quantity: item.quantity || 1,
          };
        }).filter(item => item.variant_id), // Filter out items without variant_id
      } : {
        address_id: selectedAddress,
        shipping_method_id: selectedShipping,
        discount_code: discountCode || null,
      };

      // Debug: Log request body
      console.log("Checkout request body:", JSON.stringify(body, null, 2));

      const res = await fetch("http://127.0.0.1:8000/api/checkout/", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast.dismiss();
        toast.success("Order created successfully!");
        // Clear discount code from session
        sessionStorage.removeItem('discountCode');
        // Clear guest cart if guest checkout
        if (isGuest) {
          clearGuestCart();
        }
        // Trigger cart update event to refresh navbar
        window.dispatchEvent(new Event('cartUpdated'));
        // Redirect to payment - include guest email if guest
        const paymentUrl = isGuest 
          ? `/payment/${data.order_id}?guest_email=${encodeURIComponent(guestInfo.email)}`
          : `/payment/${data.order_id}`;
        router.push(paymentUrl);
      } else {
        toast.dismiss();
        // Show more detailed error message
        const errorMsg = data.error || data.detail || data.message || JSON.stringify(data) || "Failed to create order";
        console.error("Checkout error:", data);
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.dismiss();
      console.error("Checkout exception:", error);
      const errorMsg = error.message || "Error processing order";
      toast.error(errorMsg);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
        <div className="min-h-screen flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-xl mb-4">Your cart is empty</p>
            <button
              onClick={() => router.push("/products")}
              className="bg-[#FF6B9D] text-white px-6 py-2 rounded-md hover:bg-[#FF5A8A]"
            >
              Continue Shopping
            </button>
          </div>
        </div>
    );
  }

  const selectedShippingMethod = shippingMethods.find(
    (sm) => sm.id === selectedShipping
  );
  const shippingCost = selectedShippingMethod?.price ? parseFloat(selectedShippingMethod.price) : 0;
  const subtotal = cart.total_price ? parseFloat(cart.total_price) : 0;
  const total = subtotal + shippingCost;

  return (
    <div>
      <div className="min-h-screen px-5 lg:px-40 pb-20">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Checkout</h1>
            {isGuest && (
              <Link href="/signin" className="text-[#FF6B9D] hover:underline text-sm">
                Already have an account? Sign in
              </Link>
            )}
          </div>
          {isGuest && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Checkout as a guest. <Link href="/signin" className="text-[#FF6B9D] hover:underline font-semibold">Sign in</Link> to save addresses and view order history.
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-[65%_35%] gap-8">
          {/* Left Column - Address and Shipping */}
          <div className="space-y-6">
            {/* Guest Info (if guest checkout) */}
            {isGuest && (
              <div className="border border-gray-200 rounded-md p-6">
                <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-3"
                    required
                  />
                </div>
              </div>
            )}

            {/* Address Selection */}
            <div className="border border-gray-200 rounded-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <HiLocationMarker size={20} />
                <h2 className="text-xl font-semibold">Delivery Address</h2>
              </div>

            {!isGuest && addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block border rounded-md p-4 cursor-pointer ${
                        selectedAddress === address.id
                          ? "border-[#FF6B9D] bg-[#FF6B9D]/10"
                          : "border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddress === address.id}
                        onChange={(e) => setSelectedAddress(Number(e.target.value))}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-semibold">{address.full_name}</p>
                        <p className="text-sm text-gray-600">{address.address_line}</p>
                        <p className="text-sm text-gray-600">
                          {address.city}, {address.region}
                        </p>
                        <p className="text-sm text-gray-600">{address.phone_number}</p>
                        {address.is_default && (
                          <span className="text-xs bg-[#FF6B9D]/10 text-[#FF6B9D] px-2 py-1 rounded mt-1 inline-block">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

            {!isGuest && !showNewAddress && addresses.length > 0 && (
                <button
                  onClick={() => setShowNewAddress(true)}
                  className="text-[#FF6B9D] hover:underline text-sm"
                >
                  + Add New Address
                </button>
            )}

            {(isGuest || showNewAddress) && (
                <div className="border border-gray-200 rounded-md p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newAddress.full_name}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, full_name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newAddress.phone_number}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, phone_number: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                  <input
                    type="text"
                    placeholder="Address Line"
                    value={newAddress.address_line}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, address_line: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-2"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={newAddress.city}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, city: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-2"
                    />
                    <input
                      type="text"
                      placeholder="Region"
                      value={newAddress.region}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, region: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-2"
                    />
                  </div>
                  {!isGuest && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, is_default: e.target.checked })
                      }
                    />
                    <span className="text-sm">Set as default address</span>
                  </label>
                  )}
                  {isGuest && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 <Link href="/signin" className="font-semibold underline hover:text-blue-900 dark:hover:text-blue-100">Sign in</Link> to save this address for faster checkout next time!
                      </p>
                    </div>
                  )}
                  {!isGuest && (
                    <div className="flex gap-2 mt-4">
                    <button
                      onClick={createAddress}
                      className="bg-[#FF6B9D] text-white px-4 py-2 rounded-md text-sm hover:bg-[#FF5A8A]"
                    >
                      Save Address
                    </button>
                    <button
                      onClick={() => {
                        setShowNewAddress(false);
                        setNewAddress({
                          full_name: "",
                          phone_number: "",
                          address_line: "",
                          city: "",
                          region: "",
                          is_default: false,
                        });
                      }}
                        className="border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Shipping Method */}
            <div className="border border-gray-200 rounded-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <HiTruck size={20} />
                <h2 className="text-xl font-semibold">Shipping Method</h2>
              </div>

              <div className="space-y-3">
                {shippingMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`block border rounded-md p-4 cursor-pointer ${
                      selectedShipping === method.id
                        ? "border-[#FF6B9D] bg-[#FF6B9D]/10"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={method.id}
                      checked={selectedShipping === method.id}
                      onChange={(e) => setSelectedShipping(Number(e.target.value))}
                      className="mr-3"
                    />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{method.name}</span>
                      <span className="font-bold">GH₵{method.price}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="border border-gray-200 rounded-md p-6 h-fit">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {cart.items.map((item, index) => (
                <div key={item.id || item.variant?.id || item.variant_id || `cart-item-${index}`} className="flex justify-between text-sm pb-3 border-b border-gray-100">
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.variant?.product?.title || "Product"}
                    </p>
                    {item.variant && (
                      <p className="text-xs text-gray-500 mt-1">
                        {[
                          item.variant.length,
                          item.variant.color,
                          item.variant.texture,
                          item.variant.bundle_deal ? `${item.variant.bundle_deal} bundles` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold ml-4">
                    GH₵{((item.variant?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>GH₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>GH₵{shippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>GH₵{total.toFixed(2)}</span>
              </div>
            </div>

            {(() => {
              // Calculate validation state - this will re-run on every render
              let isValid = false;
              
              if (isGuest) {
                const hasEmail = guestInfo.email && guestInfo.email.trim().length > 0;
                const hasName = guestInfo.name && guestInfo.name.trim().length > 0;
                const hasFullName = newAddress.full_name && newAddress.full_name.trim().length > 0;
                const hasPhone = newAddress.phone_number && newAddress.phone_number.trim().length > 0;
                const hasAddressLine = newAddress.address_line && newAddress.address_line.trim().length > 0;
                const hasCity = newAddress.city && newAddress.city.trim().length > 0;
                const hasRegion = newAddress.region && newAddress.region.trim().length > 0;
                const hasShipping = selectedShipping !== null && selectedShipping !== undefined;
                
                isValid = hasEmail && hasName && hasFullName && hasPhone && hasAddressLine && hasCity && hasRegion && hasShipping;
              } else {
                isValid = selectedAddress !== null && selectedShipping !== null && selectedShipping !== undefined;
              }
              
              return (
                <button
                  onClick={handleCheckout}
                  disabled={processing || !isValid}
                  className="w-full bg-[#FF6B9D] text-white py-3 rounded-md font-semibold mt-6 hover:bg-[#FF5A8A] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Proceed to Payment"}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

