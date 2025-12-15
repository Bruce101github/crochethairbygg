/**
 * Guest cart utilities for managing cart in localStorage
 */

export const GUEST_CART_KEY = 'guest_cart';

/**
 * Get guest cart from localStorage
 * @returns {Object|null} Cart object with items array
 */
export function getGuestCart() {
  if (typeof window === 'undefined') return null;
  
  try {
    const cartData = localStorage.getItem(GUEST_CART_KEY);
    if (!cartData) return null;
    
    const cart = JSON.parse(cartData);
    // Ensure cart has items array
    if (!cart.items) {
      cart.items = [];
    }
    return cart;
  } catch (error) {
    console.error('Error reading guest cart:', error);
    return null;
  }
}

/**
 * Save guest cart to localStorage
 * @param {Object} cart - Cart object with items array
 */
export function saveGuestCart(cart) {
  if (typeof window === 'undefined') return;
  
  try {
    // Ensure items array exists
    if (!cart.items) {
      cart.items = [];
    }
    
    // Calculate total price
    cart.total_price = cart.items.reduce((total, item) => {
      const price = parseFloat(item.variant?.price || item.price || 0);
      const quantity = parseInt(item.quantity || 1);
      return total + (price * quantity);
    }, 0);
    
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    
    // Dispatch event to update navbar
    window.dispatchEvent(new Event('cartUpdated'));
  } catch (error) {
    console.error('Error saving guest cart:', error);
  }
}

/**
 * Add item to guest cart
 * @param {Object} variant - Product variant object
 * @param {number} quantity - Quantity to add
 * @returns {Object} Updated cart
 */
export function addToGuestCart(variant, quantity = 1) {
  const cart = getGuestCart() || { items: [] };
  
  // Find existing item with same variant
  const existingItemIndex = cart.items.findIndex(
    item => item.variant_id === variant.id || item.variant?.id === variant.id
  );
  
  if (existingItemIndex >= 0) {
    // Update quantity
    cart.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    cart.items.push({
      variant_id: variant.id,
      variant: {
        id: variant.id,
        price: variant.price,
        product: variant.product || {
          id: variant.product_id,
          title: variant.product_title,
          images: variant.product_images || []
        }
      },
      quantity: quantity
    });
  }
  
  saveGuestCart(cart);
  return cart;
}

/**
 * Remove item from guest cart
 * @param {number} variantId - Variant ID to remove
 */
export function removeFromGuestCart(variantId) {
  const cart = getGuestCart();
  if (!cart) return;
  
  cart.items = cart.items.filter(
    item => item.variant_id !== variantId && item.variant?.id !== variantId
  );
  
  saveGuestCart(cart);
}

/**
 * Update item quantity in guest cart
 * @param {number} variantId - Variant ID
 * @param {number} quantity - New quantity
 */
export function updateGuestCartQuantity(variantId, quantity) {
  if (quantity <= 0) {
    removeFromGuestCart(variantId);
    return;
  }
  
  const cart = getGuestCart();
  if (!cart) return;
  
  const item = cart.items.find(
    item => item.variant_id === variantId || item.variant?.id === variantId
  );
  
  if (item) {
    item.quantity = quantity;
    saveGuestCart(cart);
  }
}

/**
 * Clear guest cart
 */
export function clearGuestCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_CART_KEY);
  window.dispatchEvent(new Event('cartUpdated'));
}

/**
 * Get guest cart item count
 * @returns {number} Total number of items in cart
 */
export function getGuestCartItemCount() {
  const cart = getGuestCart();
  if (!cart || !cart.items) return 0;
  
  return cart.items.reduce((total, item) => total + (item.quantity || 1), 0);
}

/**
 * Get guest cart total price
 * @returns {number} Total price of all items
 */
export function getGuestCartTotal() {
  const cart = getGuestCart();
  if (!cart || !cart.items) return 0;
  
  return cart.items.reduce((total, item) => {
    const price = parseFloat(item.variant?.price || item.price || 0);
    const quantity = parseInt(item.quantity || 1);
    return total + (price * quantity);
  }, 0);
}
