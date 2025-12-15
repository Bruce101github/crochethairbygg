"use client";

import { HiTruck, HiRefresh, HiShieldCheck } from "react-icons/hi";

export default function TrustBadges() {
  const badges = [
    { icon: HiTruck, text: "Free Shipping" },
    { icon: HiRefresh, text: "30 Days Return" },
    { icon: HiShieldCheck, text: "100% Human Hair" },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 py-4 transition-colors">
      <div className="max-w-7xl mx-auto px-5 lg:px-20">
        <div className="grid grid-cols-3 gap-2 lg:gap-4">
          {badges.map((badge, index) => {
            const Icon = badge.icon;
            return (
              <div key={index} className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2">
                <div className="bg-[#FF6B9D]/10 dark:bg-[#FF6B9D]/20 p-1 sm:p-1.5 rounded-full flex-shrink-0">
                  <Icon size={14} className="sm:w-4 sm:h-4 text-[#FF6B9D]" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                    {badge.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

