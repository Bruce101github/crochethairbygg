"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiShoppingBag,
  HiShoppingCart,
  HiLogout,
  HiX,
  HiChartBar,
  HiTrendingUp,
  HiTag,
} from "react-icons/hi";

export default function AdminSidebar({ sidebarOpen, setSidebarOpen, onLogout }) {
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a1a] text-white transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out shadow-2xl`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6B9D] to-[#FF5A8A] bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white transition"
          >
            <HiX size={24} />
          </button>
        </div>
        <nav className="mt-4 px-3">
          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/dashboard")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiChartBar size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            href="/admin/analytics"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/analytics")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiTrendingUp size={20} />
            <span className="font-medium">Analytics</span>
          </Link>
          <Link
            href="/admin/products"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/products")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiShoppingBag size={20} />
            <span className="font-medium">Products</span>
          </Link>
          <Link
            href="/admin/orders"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/orders")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiShoppingCart size={20} />
            <span className="font-medium">Orders</span>
          </Link>
          <Link
            href="/admin/categories"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/categories")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiShoppingBag size={20} />
            <span className="font-medium">Categories</span>
          </Link>
          <Link
            href="/admin/hero-slides"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/hero-slides")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiTrendingUp size={20} />
            <span className="font-medium">Hero Slides</span>
          </Link>
          <Link
            href="/admin/promo-banners"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/promo-banners")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiTrendingUp size={20} />
            <span className="font-medium">Promo Banners</span>
          </Link>
          <Link
            href="/admin/discount-codes"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/discount-codes")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiTag size={20} />
            <span className="font-medium">Discount Codes</span>
          </Link>
          <Link
            href="/admin/returns"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
              isActive("/admin/returns")
                ? "bg-[#2a2a2a] text-white"
                : "text-gray-300 hover:bg-[#2a2a2a] hover:text-white"
            }`}
          >
            <HiShoppingBag size={20} />
            <span className="font-medium">Returns</span>
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900/20 transition mt-4 w-full text-left text-gray-300 hover:text-red-400"
          >
            <HiLogout size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </nav>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}

