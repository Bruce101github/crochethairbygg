"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaSearch, FaHeart, FaShoppingBag, FaUser, FaBars, FaTimes } from "react-icons/fa";
import { HiSearch } from "react-icons/hi";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { GH, US, EU, GB, NG, ZA, AE, CA } from "country-flag-icons/react/1x1";
import {motion, AnimatePresence} from "framer-motion";

export default function Navbar() {
  const pathname = usePathname();
  const [currencyMenu, setCurrencyMenu] = useState(false);
  const [currency, setCurrency] = useState("GH");
  const [language, setLanguage] = useState("EN");
  const [sideMenuOpen, setSideMenuOpen] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  const [promoBannerHeight, setPromoBannerHeight] = useState(0);
  const [navCategories, setNavCategories] = useState([]);
   const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });


  useEffect(() => {
}, [currency]);

const currencyOptions = [
    { code: "GH", label: "GHS", flag: <GH />},
    { code: "NG", label: "NGN", flag: <NG />},
    { code: "ZA", label: "ZAR", flag: <ZA />},
    { code: "US", label: "USD", flag: <US />},
    { code: "GB", label: "GBP", flag: <GB />},
    { code: "EU", label: "EUR", flag: <EU />},
    { code: "AE", label: "AED", flag: <AE />},
    { code: "CA", label: "CAD", flag: <CA />},
  ];

const languageOptions = [
    { code: "EN", label: "English" },
    { code: "FR", label: "Francais" },
  ];

  async function fetchCartItems(accessToken) {
    if (!accessToken) {
      // Load guest cart from localStorage
      try {
        const { getGuestCart } = await import("@/utils/guestCart");
        const guestCart = getGuestCart();
        if (guestCart && guestCart.items && guestCart.items.length > 0) {
          setCartItems(guestCart.items);
        } else {
          setCartItems([]);
        }
      } catch (error) {
        console.error("Error loading guest cart:", error);
      setCartItems([]);
      }
      return;
    }

  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cart/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
    },
  })
    .then((res) => {
        if (!res.ok) {
          // If unauthorized or forbidden, user is not logged in
          if (res.status === 401 || res.status === 403) {
            setCartItems([]);
            return;
          }
          throw new Error("Network response not ok");
        }
      return res.json();
    })
    .then((products) => {
        if (products) {
          // Handle both array and object responses
          if (Array.isArray(products)) {
            // If array, take first cart if exists
            const cart = products.length > 0 ? products[0] : null;
            if (cart && cart.items && cart.items.length > 0) {
              setCartItems(cart.items);
            } else {
              setCartItems([]);
            }
          } else if (products.items) {
            // If object with items, check if items array is empty
            if (products.items.length > 0) {
              setCartItems(products.items);
            } else {
              setCartItems([]);
            }
          } else {
            setCartItems([]);
          }
        } else {
          setCartItems([]);
        }
    })
      .catch((error) => {
        // Silently handle errors - user might not be logged in
        setCartItems([]);
    });
}

useEffect(() => {
    fetchCartItems(accessToken);
    
    // Listen for cart update events
    const handleCartUpdate = () => {
      if (accessToken) {
      fetchCartItems(accessToken);
      }
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [accessToken]);

  useEffect(() => {
    // Fetch navigation categories
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/?is_nav_link=true`)
      .then((res) => res.json())
      .then((data) => {
        // Filter to get only top-level categories that are nav links
        const topLevel = Array.isArray(data) ? data.filter(cat => !cat.parent) : [];
        setNavCategories(topLevel);
      })
      .catch((err) => console.error("Error fetching nav categories:", err));
  }, []);


  useEffect(() => {
    // Calculate total header height (promo banner + navbar)
    const updateHeaderHeight = () => {
      const promoBanner = document.querySelector('[data-promo-banner="true"]');
      const promoHeight = promoBanner ? promoBanner.offsetHeight : 0;
      setPromoBannerHeight(promoHeight);
      document.documentElement.style.setProperty('--promo-banner-height', `${promoHeight}px`);
      
      const navbar = document.querySelector('[data-navbar]');
      if (navbar) {
        const navbarHeight = navbar.offsetHeight;
        const totalHeight = promoHeight + navbarHeight;
        document.documentElement.style.setProperty('--header-total-height', `${totalHeight}px`);
      } else {
        // Fallback if navbar not found yet
        document.documentElement.style.setProperty('--header-total-height', `${promoHeight + 80}px`);
      }
    };

    // Update immediately and after a short delay to ensure DOM is ready
    updateHeaderHeight();
    const timeout = setTimeout(updateHeaderHeight, 100);
    const timeout2 = setTimeout(updateHeaderHeight, 300);
    
    // Also listen for resize and when promo banner height might change
    window.addEventListener('resize', updateHeaderHeight);
    
    // Use MutationObserver to watch for changes in the promo banner height
    let observer = null;
    const setupObserver = () => {
      const promoBanner = document.querySelector('[data-promo-banner="true"]');
      if (promoBanner && !observer) {
        observer = new MutationObserver(updateHeaderHeight);
        observer.observe(promoBanner, { attributes: true, childList: true, subtree: true });
      }
    };
    
    // Try to set up observer after a delay
    const observerTimeout = setTimeout(setupObserver, 200);
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      clearTimeout(observerTimeout);
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  function handleLogout() {
    // Clear tokens from localStorage
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    // Clear user state
    setUser(null);
    setAccessToken(null);
    setCartItems([]);
    // Clear guest cart if exists
    try {
      const { clearGuestCart } = require("@/utils/guestCart");
      clearGuestCart();
    } catch (e) {
      // Guest cart utils might not be available, that's okay
    }
    // Redirect to home page
    window.location.href = "/";
  }

  function handleLogout() {
    // Clear tokens from localStorage
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    // Clear user state
    setUser(null);
    setAccessToken(null);
    setCartItems([]);
    // Clear guest cart if exists
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("guest_cart");
      } catch (e) {
        // Ignore errors
      }
    }
    // Trigger cart update event
    window.dispatchEvent(new Event('cartUpdated'));
    // Redirect to home page
    window.location.href = "/";
  }

  useEffect(() => {
    // Fetch user info
    if (accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
        })
        .then((userData) => {
          if (userData) {
            setUser(userData);
          }
        })
        .catch(() => {
          // Silently fail
        });
    } else {
      setUser(null);
    }
  }, [accessToken]);


  return (
    <>
    <div data-navbar className="w-full h-auto fixed z-[1000]" style={{ 
      top: `${promoBannerHeight}px`,
    }}>
      {/* Desktop Navigation Bar */}
      <div className="hidden lg:block w-full px-20 py-4 bg-white/95 dark:bg-black/95">
        <div className="flex items-center justify-between">
          <span className="flex gap-10 items-center flex-1 min-w-0">
        <Link href="/" className="flex items-center flex-shrink-0">
              <span className="text-xl font-bold text-gray-900 dark:text-white">CROCHET HAIR</span>
              <span className="text-xl font-bold ml-1 text-gray-900 dark:text-white">by GG</span>
        </Link>
            <nav className="flex gap-6 font-medium text-gray-900 dark:text-white">
          <Link 
            href="/" 
            className={`relative hover:text-[#FF6B9D] transition ${
              pathname === "/" ? "text-[#FF6B9D]" : ""
            }`}
            >
            Home
          </Link>
          <Link 
            href="/products" 
            className={`relative hover:text-[#FF6B9D] transition ${
              pathname === "/products" ? "text-[#FF6B9D]" : ""
            }`}
          >
            Products
          </Link>
          <Link 
            href="/about" 
            className={`relative hover:text-[#FF6B9D] transition ${
              pathname === "/about" ? "text-[#FF6B9D]" : ""
            }`}
          >
            About
          </Link>
          <Link 
            href="/contact" 
            className={`relative hover:text-[#FF6B9D] transition ${
              pathname === "/contact" ? "text-[#FF6B9D]" : ""
            }`}
          >
            Contact
          </Link>
          <Link 
            href="/track" 
            className={`relative hover:text-[#FF6B9D] transition ${
              pathname === "/track" ? "text-[#FF6B9D]" : ""
            }`}
            >
            Track Order
          </Link>
        </nav>
      </span>
          <span className="flex gap-4 items-center flex-shrink-0 text-gray-900 dark:text-white">
        {/* Desktop Search */}
            <div className="relative rounded-3xl py-2 pl-4 pr-10 w-150 text-gray-900 dark:text-white placeholder:text-gray-600 dark:placeholder:text-white/70" style={{
              background: 'rgba(0,0,0,0.05)'
            }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const query = e.target.search.value;
              if (query.trim()) {
                window.location.href = `/products?search=${encodeURIComponent(query)}`;
              }
            }}
          >
          <input
              name="search"
                  className="w-full focus:outline-none bg-transparent placeholder:text-gray-600 dark:placeholder:text-white/70 text-gray-900 dark:text-white"
            placeholder="what are you looking for ?"
          />
                <button type="submit" className="absolute right-4 text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white">
            <FaSearch />
          </button>
          </form>
        </div>
            <Link href="/favorites">
              <button className="text-gray-900 dark:text-white hover:text-[#FF6B9D] transition">
                <FaHeart size={22} />
        </button>
            </Link>
        <Link href="/cart">
              <button className="relative text-gray-900 dark:text-white hover:text-[#FF6B9D] transition">
                <FaShoppingBag size={22} />
                {(() => {
                  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                    return null;
                  }
                  const totalItems = cartItems.reduce((sum, item) => {
                    const quantity = item && typeof item.quantity === 'number' ? item.quantity : 1;
                    return sum + quantity;
                  }, 0);
                  if (totalItems > 0) {
                    return (
                      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-[#FF6B9D] text-white text-sm rounded-full flex items-center justify-center font-semibold">
                        {totalItems > 99 ? '99+' : totalItems}
          </span>
                    );
                  }
                  return null;
                })()}
              </button>
            </Link>
        {user ? (
          <div className="relative group">
            <Link href="/settings" className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-[#FF6B9D] transition">
              <span className="text-base font-medium">Hi, {user?.username || user?.email?.split('@')[0] || 'User'}</span>
            <FaUser size={22} className="text-[#FF6B9D]" />
          </Link>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.username || user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
                </div>
                <Link href="/orders" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  My Orders
                </Link>
                <Link href="/returns" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Returns
                </Link>
                <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Settings
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <Link href="/signin" className="text-gray-900 dark:text-white hover:text-[#FF6B9D] transition">
            <FaUser size={22} />
          </Link>
        )}
            <button onClick={()=>setCurrencyMenu(prev => !prev)} className="relative rounded-full h-7 w-7 bg-black/5 overflow-hidden">
            {currencyOptions.find(option => option.code === currency)?.flag}
        </button>
          </span>
        </div>
      </div>

      {/* Mobile Navigation Bar - eBay Style */}
      <div className="lg:hidden bg-white/95 dark:bg-black/95 flex flex-col">
        {/* Row 1: Sign in, Ship to, Cart, Favorite */}
        <div className="w-full px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {user ? (
              <Link href="/settings" className="flex items-center gap-1.5 text-gray-900 dark:text-white hover:text-[#FF6B9D] transition text-sm">
                <FaUser size={18} />
                <span className="text-xs">Hi, {user?.username || user?.email?.split('@')[0] || 'User'}</span>
              </Link>
            ) : (
              <Link href="/signin" className="flex items-center gap-1.5 text-gray-900 dark:text-white hover:text-[#FF6B9D] transition text-sm">
                <FaUser size={18} />
                <span className="text-xs">Sign in</span>
              </Link>
            )}
            <button 
              onClick={()=>setCurrencyMenu(prev => !prev)} 
              className="flex items-center gap-1.5 text-gray-900 dark:text-white hover:text-[#FF6B9D] transition text-sm"
            >
              <div className="w-4 h-4 rounded-full overflow-hidden">
                {currencyOptions.find(option => option.code === currency)?.flag}
              </div>
              <span className="text-xs">Ship to</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/favorites">
              <button className="text-gray-900 dark:text-white hover:text-[#FF6B9D] transition">
                <FaHeart size={18} />
              </button>
            </Link>
            <Link href="/cart">
              <button className="relative text-gray-900 dark:text-white hover:text-[#FF6B9D] transition">
                <FaShoppingBag size={18} />
                {(() => {
                  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                    return null;
                  }
                  const totalItems = cartItems.reduce((sum, item) => {
                    const quantity = item && typeof item.quantity === 'number' ? item.quantity : 1;
                    return sum + quantity;
                  }, 0);
                  if (totalItems > 0) {
                    return (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-[#FF6B9D] text-white text-xs rounded-full flex items-center justify-center font-semibold">
                        {totalItems > 99 ? '99+' : totalItems}
                      </span>
                    );
                  }
                  return null;
                })()}
              </button>
            </Link>
            <button onClick={() => setSideMenuOpen(prev => !prev)} className="text-gray-900 dark:text-white hover:text-[#FF6B9D] transition">
              <FaBars size={18} />
            </button>
          </div>
        </div>

        {/* Row 2: Logo and Search Bar (Centered) */}
        <div className="w-full px-3 py-2 flex items-center gap-2 border-t border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="flex items-center flex-shrink-0">
            <span className="text-base font-bold text-gray-900 dark:text-white">CROCHET HAIR</span>
          </Link>
          <div className="flex-1 relative bg-gray-100 dark:bg-gray-800 rounded-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const query = e.target.search.value;
                if (query.trim()) {
                  window.location.href = `/products?search=${encodeURIComponent(query)}`;
                }
              }}
              className="flex items-center"
            >
              <input
                name="search"
                type="text"
                className="w-full px-3 py-1.5 bg-transparent focus:outline-none text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white"
                placeholder="Search products..."
              />
              <button
                type="submit"
                className="px-2 text-[#FF6B9D] hover:text-[#FF5A8A] transition"
              >
                <FaSearch size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Row 3: Category Navigation */}
        <div className="w-full px-3 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-4 text-sm min-w-max">
            <Link href="/products?deal=today" className="hover:text-[#FF6B9D] transition font-medium whitespace-nowrap text-gray-900 dark:text-white">
              Today's Deals
            </Link>
            {navCategories.map((category) => (
              <Link 
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="hover:text-[#FF6B9D] transition font-medium whitespace-nowrap text-gray-900 dark:text-white"
              >
                {category.name}
              </Link>
            ))}
            <Link href="/track" className="hover:text-[#FF6B9D] transition font-medium whitespace-nowrap text-gray-900 dark:text-white">
              Track Order
            </Link>
            <Link href="/contact" className="hover:text-[#FF6B9D] transition font-medium whitespace-nowrap text-gray-900 dark:text-white">
              Help
            </Link>
          </div>
        </div>
      </div>

      {/* Currency Menu Dropdown */}
      <div className={currencyMenu === true ? "absolute flex flex-col gap-2 top-20 right-4 lg:right-10 p-4 bg-white dark:bg-gray-800 rounded-b-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50" : "hidden"}> 
        <label htmlFor="currency" className="text-gray-900 dark:text-white">Currency</label>
        <div id="currency" className="flex flex-col gap-2 mb-2">
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="GH"><GH className="w-8 h-5"/> <p>GHS</p></button>
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="NG"><NG className="w-8 h-5"/> <p>NGN</p></button>
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="ZA"><ZA className="w-8 h-5"/> <p>ZAR</p></button>
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="US"><US className="w-8 h-5"/> <p>USD</p></button>
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="GB"><GB className="w-8 h-5"/> <p>GBP</p></button>
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="EU"><EU className="w-8 h-5"/> <p>EUR</p></button>
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="AE"><AE className="w-8 h-5"/> <p>AED</p></button>
          <button onClick={(e) => { setCurrency(e.currentTarget.value); setCurrencyMenu(false); }} className="flex gap-1 text-gray-900 dark:text-white hover:text-[#FF6B9D]" value="CA"><CA className="w-8 h-5"/> <p>CAD</p></button>
        </div>
      </div>
      
      {/* Desktop Navigation Links Bar */}
      <div className="w-full px-20 py-2 hidden lg:block bg-white/95 dark:bg-black/95 text-gray-900 dark:text-white">
        <div id="nav-xshop" className="nav-progressive-content flex items-center gap-6 text-sm">
          <Link href="/products?deal=today" className="hover:text-[#FF6B9D] transition font-medium">
            Today's Deals
          </Link>
          {navCategories.map((category) => (
            <div key={category.id} className="relative group">
              <Link 
                href={`/products?category=${category.slug}`}
                className="hover:text-[#FF6B9D] transition font-medium"
              >
                {category.name}
              </Link>
              {category.subcategories && category.subcategories.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 border border-gray-200 dark:border-gray-700">
                  {category.subcategories.map((subcat) => (
                    <Link
                      key={subcat.id}
                      href={`/products?category=${subcat.slug}`}
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition text-sm"
                    >
                      {subcat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link href="/track" className="hover:text-[#FF6B9D] transition font-medium">
            Track Order
          </Link>
          <Link href="/contact" className="hover:text-[#FF6B9D] transition font-medium">
            Customer Service
          </Link>
          {user && (
            <Link href="/orders" className="hover:text-[#FF6B9D] transition font-medium">
              My Orders
            </Link>
          )}
        </div>
      </div>
    </div>

    {/* Mobile Search Modal */}
    <AnimatePresence>
      {showMobileSearch && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMobileSearch(false)}
            className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
          />
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ ease: "easeInOut", duration: 0.3 }}
            className="fixed top-0 left-0 right-0 bg-white z-[9999] lg:hidden shadow-lg"
            style={{ top: `${promoBannerHeight}px` }}
          >
            <div className="px-4 py-3 flex items-center gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const query = e.target.search.value;
                  if (query.trim()) {
                    setShowMobileSearch(false);
                    window.location.href = `/products?search=${encodeURIComponent(query)}`;
                  }
                }}
                className="flex-1 flex items-center gap-2"
              >
                <div className="flex-1 relative bg-gray-100 rounded-lg">
                  <input
                    name="search"
                    type="text"
                    autoFocus
                    className="w-full px-4 py-2.5 bg-transparent focus:outline-none text-base placeholder:text-gray-500"
                    placeholder="Search products..."
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#FF6B9D] hover:text-[#FF5A8A] transition"
                  >
                    <FaSearch size={20} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileSearch(false)}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Cancel
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <AnimatePresence>{sideMenuOpen && (
      <>
        <motion.div 
          initial={{opacity: 0}} 
          animate={{opacity: 1}} 
          exit={{opacity: 0}} 
          onClick={() => setSideMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-[9998]"
        />
        <motion.div 
          initial={{x: "100%"}} 
          animate={{x: 0}} 
          exit={{x: "100%"}} 
          transition={{ease: "easeInOut", duration: 0.3}} 
          className="fixed right-0 top-0 bg-white w-[85%] max-w-sm h-full z-[9999] shadow-2xl overflow-y-auto"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-[#FF6B9D]">Menu</h2>
            <button onClick={() => setSideMenuOpen(false)} className="text-black hover:text-[#FF6B9D]">
              <FaTimes size={24} />
            </button>
          </div>
          {user ? (
            <Link href="/settings" onClick={() => setSideMenuOpen(false)}>
              <div className="px-4 py-3 border-b border-gray-100 hover:bg-[#FF6B9D]/10 transition">
                <div className="flex gap-2 items-center text-black">
                  <FaUser size={20} className="text-[#FF6B9D]" /> 
                  <div>
                    <p className="font-medium">Hi, {user?.username || user?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-sm text-gray-500">Signed in</p>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <Link href="/signin" onClick={() => setSideMenuOpen(false)}>
              <button className="flex gap-2 items-center text-black hover:text-[#FF6B9D] w-full px-4 py-3 border-b border-gray-100">
                <FaUser size={20} /> 
                <span>Sign in</span>
              </button>
            </Link>
          )}
          <nav className="flex flex-col text-black">
            <Link 
              href="/" 
              className={`px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition ${
                pathname === "/" ? "text-[#FF6B9D] bg-[#FF6B9D]/5" : ""
              }`}
              onClick={() => setSideMenuOpen(false)}
            >
            Home
          </Link>
            <Link 
              href="/products" 
              className={`px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition ${
                pathname === "/products" ? "text-[#FF6B9D] bg-[#FF6B9D]/5" : ""
              }`}
              onClick={() => setSideMenuOpen(false)}
            >
            Products
          </Link>
            {user && (
              <Link 
                href="/orders" 
                className={`px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition ${
                  pathname === "/orders" ? "text-[#FF6B9D] bg-[#FF6B9D]/5" : ""
                }`}
                onClick={() => setSideMenuOpen(false)}
              >
                Orders
              </Link>
            )}
            <Link 
              href="/track" 
              className={`px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition ${
                pathname === "/track" ? "text-[#FF6B9D] bg-[#FF6B9D]/5" : ""
              }`}
              onClick={() => setSideMenuOpen(false)}
            >
              Track Order
            </Link>
            <Link 
              href="/about" 
              className={`px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition ${
                pathname === "/about" ? "text-[#FF6B9D] bg-[#FF6B9D]/5" : ""
              }`}
              onClick={() => setSideMenuOpen(false)}
            >
            About
          </Link>
            <Link 
              href="/contact" 
              className={`px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition ${
                pathname === "/contact" ? "text-[#FF6B9D] bg-[#FF6B9D]/5" : ""
              }`}
              onClick={() => setSideMenuOpen(false)}
            >
            Contact
          </Link>
            <Link 
              href="/cart" 
              className="px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition"
              onClick={() => setSideMenuOpen(false)}
            >
              Cart
          </Link>
            <Link 
              href="/favorites" 
              className="px-4 py-4 border-b border-gray-100 hover:bg-[#FF6B9D]/10 hover:text-[#FF6B9D] transition"
              onClick={() => setSideMenuOpen(false)}
            >
              Favorites
          </Link>
        </nav>
        </motion.div>
      </>
    )}</AnimatePresence>
    </>
  );
}
