"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiX, HiPlus, HiMinus } from "react-icons/hi";
import toast from "react-hot-toast";

export default function VariationPopup({ product, isOpen, onClose, onAddToCart, accessToken }) {
  const [selectedVariants, setSelectedVariants] = useState({});
  const [variantMatches, setVariantMatches] = useState([]);
  const [quantity, setQuantity] = useState(1);

  // Reset state when product changes or popup opens
  useEffect(() => {
    if (isOpen && product) {
      setSelectedVariants({});
      setVariantMatches([]);
      setQuantity(1);
    }
  }, [isOpen, product]);

  // Get unique values for each variant attribute
  const getUniqueValues = (key) => {
    if (!product || !product.variants) return [];
    const values = new Set();
    product.variants.forEach((variant) => {
      if (variant[key] !== null && variant[key] !== undefined) {
        values.add(variant[key]);
      }
    });
    return Array.from(values).sort();
  };

  // Get variant attributes that vary
  const getVariantAttributes = () => {
    if (!product || !product.variants) return [];
    const attributes = [];
    const firstVariant = product.variants[0];
    
    if (firstVariant) {
      const keys = ['length', 'color', 'texture', 'bundle_deal', 'wig_size', 'lace_type', 'density'];
      keys.forEach((key) => {
        if (firstVariant.hasOwnProperty(key)) {
          const uniqueValues = getUniqueValues(key);
          if (uniqueValues.length > 1) {
            attributes.push({
              key,
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
              values: uniqueValues,
            });
          }
        }
      });
    }
    return attributes;
  };

  // Handle variant selection
  const handleVariantSelection = (key, value) => {
    setSelectedVariants((prev) => {
      const updated = { ...prev, [key]: value };
      updateVariantMatches(updated);
      return updated;
    });
  };

  // Update variant matches based on selected attributes
  const updateVariantMatches = (selected) => {
    if (!product || !product.variants) return;
    
    const matches = product.variants.filter((variant) =>
      Object.entries(selected).every(([k, v]) => variant[k] === v)
    );
    setVariantMatches(matches);
  };

  // Get available attributes
  const variantAttributes = getVariantAttributes();
  const maxStock = variantMatches.length > 0 
    ? variantMatches.reduce((sum, v) => sum + (v.stock || 0), 0)
    : 0;

  // Check if a variant is fully selected
  const isVariantSelected = variantMatches.length === 1;

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!accessToken) {
      toast.error("Please sign in to add items to cart");
      return;
    }

    if (!isVariantSelected) {
      toast.error("Please select all product options");
      return;
    }

    if (variantMatches[0].stock < quantity) {
      toast.error(`Only ${variantMatches[0].stock} available in stock`);
      return;
    }

    toast.loading("Adding to bag...");
    
    try {
      // Fetch current cart
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
      
      if (getCartRes.ok) {
        const cartData = await getCartRes.json();
        const cart = Array.isArray(cartData) && cartData.length > 0 ? cartData[0] : cartData;
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
        (item) => item.variant_id === variantMatches[0].id
      );

      if (existingItemIndex >= 0) {
        // Add to existing quantity
        existingItems[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        existingItems.push({
          variant_id: variantMatches[0].id,
          quantity: quantity,
        });
      }

      // Update or create cart
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
        onAddToCart && onAddToCart();
        onClose();
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
  };

  if (!product || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[9998]"
          />
          
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold">{product.title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <HiX size={24} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Variant Selection */}
                {variantAttributes.length > 0 ? (
                  <div className="space-y-6">
                    {variantAttributes.map((attr) => (
                      <div key={attr.key}>
                        <label className="block text-sm font-semibold mb-2">
                          {attr.label}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value) => (
                            <button
                              key={value}
                              onClick={() => handleVariantSelection(attr.key, value)}
                              className={`px-4 py-2 rounded-md border transition ${
                                selectedVariants[attr.key] === value
                                  ? "bg-[#FF6B9D] text-white border-[#FF6B9D]"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-[#FF6B9D]"
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Selected Variant Info */}
                    {isVariantSelected && variantMatches[0] && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">Price:</span>
                          <span className="text-lg font-bold">₵{variantMatches[0].price}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Stock:</span>
                          <span className={variantMatches[0].stock > 0 ? "text-green-600" : "text-red-600"}>
                            {variantMatches[0].stock > 0 ? `${variantMatches[0].stock} available` : "Out of stock"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div>
                      <label className="block text-sm font-semibold mb-2">Quantity</label>
                      <div className="flex items-center gap-4">
                        <div className="border border-gray-200 flex items-center gap-3 py-2 px-3 rounded-md">
                          <button
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className={quantity <= 1 ? "opacity-30 cursor-not-allowed" : ""}
                          >
                            <HiMinus size={20} className="text-gray-600" />
                          </button>
                          <span className="font-bold min-w-[3rem] text-center text-lg">
                            {quantity}
                          </span>
                          <button
                            onClick={() => setQuantity((q) => Math.min(maxStock || 999, q + 1))}
                            disabled={!isVariantSelected || quantity >= maxStock}
                            className={
                              !isVariantSelected || quantity >= maxStock
                                ? "opacity-30 cursor-not-allowed"
                                : ""
                            }
                          >
                            <HiPlus size={20} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No variations available
                  </div>
                )}

                {/* Add to Cart Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleAddToCart}
                    disabled={!isVariantSelected || maxStock === 0}
                    className={`w-full py-3 px-6 rounded-md font-semibold transition ${
                      !isVariantSelected || maxStock === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-[#FF6B9D] text-white hover:bg-[#FF5A8A]"
                    }`}
                  >
                    {!isVariantSelected
                      ? "Please select options"
                      : maxStock === 0
                      ? "Out of stock"
                      : "Add to Bag"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
