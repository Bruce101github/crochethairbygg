"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiCurrencyDollar,
  HiShoppingCart,
  HiTrendingUp,
  HiTrendingDown,
  HiChartBar,
  HiMenu,
  HiX,
} from "react-icons/hi";
import toast from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { authenticatedFetch } from "@/utils/api";

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

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
    fetchAnalytics();
  }, [accessToken, router, periodDays]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/sales/?days=${periodDays}`
      );
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        toast.error("Failed to load analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      if (error.message === "No access token available" || error.message === "Refresh token expired") {
        router.push("/");
      } else {
        toast.error("Error loading analytics");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_access");
    localStorage.removeItem("admin_refresh");
    router.push("/");
  }

  // Simple bar chart component
  function SimpleBarChart({ data, height = 200, color = "#FF6B9D" }) {
    if (!data || data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-gray-400">
          No data available
        </div>
      );
    }

    const maxValue = Math.max(...data.map(item => item.revenue || item.count || 0));
    const chartHeight = height;

    return (
      <div className="relative" style={{ height: chartHeight }}>
        <div className="flex items-end justify-between h-full gap-1">
          {data.map((item, index) => {
            const value = item.revenue || item.count || 0;
            const barHeight = maxValue > 0 ? (value / maxValue) * (chartHeight - 40) : 0;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end"
                title={`${item.date || item.month || item.status || ''}: ₵${value.toFixed(2)}`}
              >
                <div
                  className="w-full rounded-t hover:opacity-80 transition"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: color,
                    minHeight: value > 0 ? '4px' : '0',
                  }}
                />
                <div className="text-xs text-gray-500 mt-1 text-center truncate w-full">
                  {item.date 
                    ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : item.month
                    ? new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' })
                    : item.status
                    ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                    : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B9D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Failed to load analytics</p>
      </div>
    );
  }

  const { summary, charts, top_products, orders_by_status, recent_orders } = analytics;
  const isPositiveChange = summary.revenue_change_percent >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
      <div className="lg:pl-64">
        <AdminHeader setSidebarOpen={setSidebarOpen} />
        <main className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Analytics</h1>
              <p className="text-gray-600">Comprehensive sales and revenue insights</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B9D]"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <HiCurrencyDollar size={24} className="text-green-600" />
                </div>
                {isPositiveChange ? (
                  <HiTrendingUp size={20} className="text-green-600" />
                ) : (
                  <HiTrendingDown size={20} className="text-red-600" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Period Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₵{summary.period_revenue.toFixed(2)}</p>
              <p className={`text-xs mt-2 ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                {isPositiveChange ? '+' : ''}{summary.revenue_change_percent.toFixed(1)}% vs previous period
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <HiShoppingCart size={24} className="text-blue-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Period Orders</p>
              <p className="text-2xl font-bold text-gray-900">{summary.period_orders}</p>
              <p className="text-xs text-gray-500 mt-2">Total: {summary.total_orders} orders</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <HiTrendingUp size={24} className="text-purple-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">₵{summary.avg_order_value.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-2">Based on {periodDays} days</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-amber-100 p-3 rounded-lg">
                  <HiCurrencyDollar size={24} className="text-amber-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₵{summary.total_revenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-2">All time</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Revenue Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Revenue ({periodDays} days)</h3>
              <SimpleBarChart data={charts.daily_revenue} height={250} color="#FF6B9D" />
            </div>

            {/* Orders by Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Orders by Status</h3>
              <SimpleBarChart data={orders_by_status} height={250} color="#3B82F6" />
              <div className="mt-4 space-y-2">
                {orders_by_status.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{item.status}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Products and Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Products (Last {periodDays} days)</h3>
              {top_products && top_products.length > 0 ? (
                <div className="space-y-4">
                  {top_products.map((product, index) => (
                    <div key={product.product_id || index} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#FF6B9D]/10 text-[#FF6B9D] w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{product.product_name}</p>
                          <p className="text-xs text-gray-500">{product.quantity_sold} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₵{product.revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No product sales data available</p>
              )}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h3>
              {recent_orders && recent_orders.length > 0 ? (
                <div className="space-y-3">
                  {recent_orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Order #{order.id}</p>
                        <p className="text-xs text-gray-500">
                          {order.user} • {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₵{order.total.toFixed(2)}</p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                            order.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'paid'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'shipped'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recent orders</p>
              )}
            </div>
          </div>

          {/* Additional Stats */}
          {summary.discount_orders_count > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Discount Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Discount Given</p>
                  <p className="text-2xl font-bold text-gray-900">₵{summary.total_discount_given.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Orders with Discount</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.discount_orders_count}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
