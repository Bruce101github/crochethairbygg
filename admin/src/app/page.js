"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem("admin_access");
    if (token) {
      router.push("/admin/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        toast.error("Invalid credentials");
        setLoading(false);
        return;
      }

      const data = await res.json();

      // Verify user is staff/admin
      const userRes = await fetch("http://127.0.0.1:8000/api/user/", {
        headers: {
          Authorization: `Bearer ${data.access}`,
        },
      });

      if (userRes.ok) {
        const userData = await userRes.json();
        if (!userData.is_staff) {
          toast.error("Access denied. Admin privileges required.");
          setLoading(false);
          return;
        }

        localStorage.setItem("admin_access", data.access);
        localStorage.setItem("admin_refresh", data.refresh);
        toast.success("Login successful");
        router.push("/admin/dashboard");
      } else {
        toast.error("Failed to verify admin status");
      }
    } catch (error) {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-2 text-center">Admin Login</h1>
        <p className="text-gray-600 text-center mb-8">
          Crochet Hair by GG - Admin Dashboard
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md h-12 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
        </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md h-12 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-white px-4 py-3 rounded-md font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        </div>
    </div>
  );
}
