"use client";
import Listing from "@/components/listing";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import ProductFilters from "@/components/ProductFilters";
import { HiAdjustments, HiX, HiChevronDown } from "react-icons/hi";
import { motion, AnimatePresence } from "motion/react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Page() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: [],
    priceMin: null,
    priceMax: null,
    length: [],
    color: [],
    texture: [],
  });
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("base_price");

  useEffect(() => {
    // Fetch categories
    fetch("http://127.0.0.1:8000/api/categories/")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  return (
    <div className="px-2 md:px-5 lg:px-40 pb-20 min-h-screen">
      <Breadcrumbs
        items={[
          { label: "Products", href: "/products" },
        ]}
      />
      {/* Header with Results Count and Sort */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            {searchQuery && (
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                Search results for: "{searchQuery}"
              </h1>
            )}
            {!searchQuery && (
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">All Products</h1>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <HiAdjustments size={18} />
              Filters
            </button>

            {/* Sort Dropdown - eBay Style */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap hidden sm:block">
                Sort:
              </label>
              <div className="relative">
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition min-w-[160px]"
                >
                  <option value="base_price">Price: Low to High</option>
                  <option value="-base_price">Price: High to Low</option>
                  <option value="title">Name: A to Z</option>
                  <option value="-title">Name: Z to A</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <HiChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Pills - eBay Style */}
        {(filters.category?.length > 0 || 
          filters.length?.length > 0 || 
          filters.color?.length > 0 || 
          filters.texture?.length > 0 ||
          filters.priceMin !== null) && (
          <div className="flex flex-row flex-wrap items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium mr-1 flex-shrink-0">Active filters:</span>
            {filters.category?.map((catSlug) => {
              const category = categories.find((c) => c.slug === catSlug);
              return category ? (
                <button
                  key={catSlug}
                  onClick={() => {
                    const newCategories = filters.category.filter((c) => c !== catSlug);
                    setFilters({ ...filters, category: newCategories });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-normal rounded-full border border-gray-300 dark:border-gray-600 transition-all whitespace-nowrap flex-shrink-0"
                >
                  <span>{category.name}</span>
                  <HiX size={14} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
                </button>
              ) : null;
            })}
            {filters.length?.map((length) => (
              <button
                key={length}
                onClick={() => {
                  const newLengths = filters.length.filter((l) => l !== length);
                  setFilters({ ...filters, length: newLengths });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-normal rounded-full border border-gray-300 dark:border-gray-600 transition-all whitespace-nowrap flex-shrink-0"
              >
                <span>Length: {length}</span>
                <HiX size={14} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
              </button>
            ))}
            {filters.color?.map((color) => (
              <button
                key={color}
                onClick={() => {
                  const newColors = filters.color.filter((c) => c !== color);
                  setFilters({ ...filters, color: newColors });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-normal rounded-full border border-gray-300 dark:border-gray-600 transition-all whitespace-nowrap flex-shrink-0"
              >
                <span>Color: {color}</span>
                <HiX size={14} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
              </button>
            ))}
            {filters.texture?.map((texture) => (
              <button
                key={texture}
                onClick={() => {
                  const newTextures = filters.texture.filter((t) => t !== texture);
                  setFilters({ ...filters, texture: newTextures });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-normal rounded-full border border-gray-300 dark:border-gray-600 transition-all whitespace-nowrap flex-shrink-0"
              >
                <span>Texture: {texture}</span>
                <HiX size={14} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
              </button>
            ))}
            {filters.priceMin !== null && (
              <button
                onClick={() => {
                  setFilters({ ...filters, priceMin: null, priceMax: null });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-normal rounded-full border border-gray-300 dark:border-gray-600 transition-all whitespace-nowrap flex-shrink-0"
              >
                <span>
                  {filters.priceMin === 0 && filters.priceMax === 50 && "Under ₵50"}
                  {filters.priceMin === 50 && filters.priceMax === 100 && "₵50 - ₵100"}
                  {filters.priceMin === 100 && filters.priceMax === 200 && "₵100 - ₵200"}
                  {filters.priceMin === 200 && filters.priceMax === 500 && "₵200 - ₵500"}
                  {filters.priceMin === 500 && filters.priceMax === null && "₵500+"}
                </span>
                <HiX size={14} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-[100px] bg-white border border-gray-200 rounded-lg p-6">
            <ProductFilters
              filters={filters}
              onFilterChange={setFilters}
              categories={categories}
            />
          </div>
        </aside>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {showMobileFilters && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileFilters(false)}
                className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ ease: "easeInOut", duration: 0.3 }}
                className="fixed left-0 top-0 bg-white w-[85%] max-w-sm h-full z-[9999] shadow-2xl overflow-y-auto lg:hidden"
              >
                <div className="p-6">
                  <ProductFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    categories={categories}
                    onClose={() => setShowMobileFilters(false)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Products Listing */}
        <div className="flex-1">
          <Listing 
            searchQuery={searchQuery} 
            filters={filters}
            sortBy={sortBy}
          />
        </div>
      </div>
    </div>
  );
}
