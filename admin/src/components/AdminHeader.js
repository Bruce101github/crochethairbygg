"use client";

import { HiMenu } from "react-icons/hi";

export default function AdminHeader({ setSidebarOpen }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden text-gray-600 hover:text-gray-900"
        >
          <HiMenu size={24} />
        </button>
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-sm text-gray-600">Welcome back, Admin</div>
        </div>
      </div>
    </header>
  );
}

