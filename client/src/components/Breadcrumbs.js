"use client";

import Link from "next/link";
import { HiChevronRight, HiHome } from "react-icons/hi";

export default function Breadcrumbs({ items = [] }) {
  // Always start with Home
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...items,
  ];

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 lg:mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 flex-wrap">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isHome = index === 0;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <HiChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
              )}
              {isLast || !item.href ? (
                <span className="font-medium text-gray-900 dark:text-white inline-flex items-center gap-1 max-w-[200px] md:max-w-[400px] lg:max-w-[600px]">
                  {isHome && <HiHome size={18} className="flex-shrink-0" />}
                  <span className="truncate min-w-0">{item.label}</span>
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-[#FF6B9D] transition-colors flex items-center gap-1"
                >
                  {isHome && <HiHome size={18} />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
