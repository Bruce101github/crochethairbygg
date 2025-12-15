"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { HiUser, HiLockClosed, HiShoppingBag, HiHeart, HiLogout } from "react-icons/hi";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    if (!accessToken) {
      router.push("/signin");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        if (res.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          router.push("/signin");
        }
      })
      .then((userData) => {
        if (userData) {
          setUser(userData);
      }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [accessToken, router]);

  function handleLogout() {
    // Clear tokens from localStorage
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    // Clear user state
    setUser(null);
    setAccessToken(null);
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
    router.push("/");
    toast.success("Signed out successfully");
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
      <div className="min-h-screen px-5 lg:px-40 pb-20 pt-24">
        <Breadcrumbs
          items={[
            { label: "Settings", href: "/settings" },
          ]}
        />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h1>

        <div className="max-w-4xl">
          {/* User Info Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[#FF6B9D] rounded-full flex items-center justify-center">
                <HiUser size={32} className="text-white" />
                  </div>
                  <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user?.username || user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{user?.email || ''}</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#FF6B9D] transition">
                <Link href="/orders" className="flex items-center gap-3">
                  <HiShoppingBag size={24} className="text-[#FF6B9D]" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">My Orders</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">View order history</p>
                  </div>
                </Link>
            </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#FF6B9D] transition">
                <Link href="/returns" className="flex items-center gap-3">
                  <HiHeart size={24} className="text-[#FF6B9D]" />
            <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Returns</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Manage returns & refunds</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h2>
            
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400"
              >
                <HiLogout size={24} />
                <div className="flex-1 text-left">
                  <p className="font-semibold">Sign Out</p>
                  <p className="text-sm">Sign out of your account</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
