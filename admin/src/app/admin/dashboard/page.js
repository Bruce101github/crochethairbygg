"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiShoppingBag,
  HiShoppingCart,
  HiUsers,
  HiCurrencyDollar,
  HiLogout,
  HiMenu,
  HiX,
  HiChartBar,
  HiTrendingUp,
} from "react-icons/hi";
import { authenticatedFetch } from "@/utils/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_access");
    }
    return null;
  });

  useEffect(() => {
    if (!accessToken) {
      router.push("/");
      return;
    }
    fetchStats();
  }, [accessToken, router]);

  async function fetchStats() {
    try {
      const [productsRes, ordersRes, usersRes] = await Promise.all([
        authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/`),
        authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/`),
        authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/stats/`),
      ]);

      const products = await productsRes.json();
      const orders = await ordersRes.json();
      const usersData = await usersRes.json();

      // Ensure products and orders are arrays
      const productsArray = Array.isArray(products) ? products : [];
      const ordersArray = Array.isArray(orders) ? orders : [];

      const revenue = ordersArray.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);

      setStats({
        totalProducts: productsArray.length || 0,
        totalOrders: ordersArray.length || 0,
        totalUsers: usersData.total_users || 0,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
        return;
      }
      // Set default stats on error
      setStats({
        totalProducts: 0,
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_access");
    localStorage.removeItem("admin_refresh");
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B9D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
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
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#2a2a2a] transition mb-1 text-gray-300 hover:text-white"
          >
            <HiChartBar size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            href="/admin/products"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#2a2a2a] transition mb-1 text-gray-300 hover:text-white"
          >
            <HiShoppingBag size={20} />
            <span className="font-medium">Products</span>
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#2a2a2a] transition mb-1 text-gray-300 hover:text-white"
          >
            <HiShoppingCart size={20} />
            <span className="font-medium">Orders</span>
          </Link>
          <Link
            href="/admin/categories"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#2a2a2a] transition mb-1 text-gray-300 hover:text-white"
          >
            <HiShoppingBag size={20} />
            <span className="font-medium">Categories</span>
          </Link>
          <Link
            href="/admin/hero-slides"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#2a2a2a] transition mb-1 text-gray-300 hover:text-white"
          >
            <HiTrendingUp size={20} />
            <span className="font-medium">Hero Slides</span>
          </Link>
          <Link
            href="/admin/promo-banners"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#2a2a2a] transition mb-1 text-gray-300 hover:text-white"
          >
            <HiTrendingUp size={20} />
            <span className="font-medium">Promo Banners</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900/20 transition mt-4 w-full text-left text-gray-300 hover:text-red-400"
          >
            <HiLogout size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <HiMenu size={24} />
            </button>
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-sm text-gray-600">
                Welcome back, Admin
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
              <p className="text-gray-600">Monitor your store&apos;s performance and manage your business</p>
            </div>
            <Link
              href="/admin/analytics"
              className="bg-[#FF6B9D] hover:bg-[#FF5A8A] text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <HiTrendingUp size={20} />
              View Analytics
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-4 rounded-xl">
                  <HiShoppingBag size={28} className="text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-xl">
                  <HiShoppingCart size={28} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    GH₵{stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-xl">
                  <HiCurrencyDollar size={28} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-xl">
                  <HiUsers size={28} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold mb-6 text-gray-900">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/admin/products"
                className="group border-2 border-gray-200 rounded-xl p-6 hover:border-[#FF6B9D] hover:bg-[#FF6B9D]/5 transition text-center"
              >
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 p-4 rounded-xl w-16 h-16 mx-auto mb-4 group-hover:from-amber-200 group-hover:to-amber-100 transition">
                  <HiShoppingBag size={32} className="text-amber-600 mx-auto" />
                </div>
                <p className="font-semibold text-gray-900 group-hover:text-[#FF6B9D] transition">Manage Products</p>
                <p className="text-sm text-gray-600 mt-1">Add, edit, or remove products</p>
              </Link>
              <Link
                href="/admin/categories"
                className="group border-2 border-gray-200 rounded-xl p-6 hover:border-[#FF6B9D] hover:bg-[#FF6B9D]/5 transition text-center"
              >
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-xl w-16 h-16 mx-auto mb-4 group-hover:from-blue-200 group-hover:to-blue-100 transition">
                  <HiShoppingBag size={32} className="text-blue-600 mx-auto" />
                </div>
                <p className="font-semibold text-gray-900 group-hover:text-[#FF6B9D] transition">Manage Categories</p>
                <p className="text-sm text-gray-600 mt-1">Organize your product categories</p>
              </Link>
              <Link
                href="/admin/orders"
                className="group border-2 border-gray-200 rounded-xl p-6 hover:border-[#FF6B9D] hover:bg-[#FF6B9D]/5 transition text-center"
              >
                <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-xl w-16 h-16 mx-auto mb-4 group-hover:from-green-200 group-hover:to-green-100 transition">
                  <HiShoppingCart size={32} className="text-green-600 mx-auto" />
                </div>
                <p className="font-semibold text-gray-900 group-hover:text-[#FF6B9D] transition">View Orders</p>
                <p className="text-sm text-gray-600 mt-1">Track and manage customer orders</p>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
