"use client";

import { useState, useEffect } from "react";
import { HiX, HiChevronDown, HiChevronUp, HiAdjustments } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductFilters({ 
  filters, 
  onFilterChange, 
  categories = [],
  onClose 
}) {
  const [openSections, setOpenSections] = useState({
    category: true,
    price: true,
    length: false,
    color: false,
    texture: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get unique values from products for filters
  const getUniqueValues = (key) => {
    // This will be populated from products passed as prop
    return [];
  };

  const priceRanges = [
    { label: "Under ₵50", min: 0, max: 50 },
    { label: "₵50 - ₵100", min: 50, max: 100 },
    { label: "₵100 - ₵200", min: 100, max: 200 },
    { label: "₵200 - ₵500", min: 200, max: 500 },
    { label: "₵500 and above", min: 500, max: null },
  ];

  const lengths = ["12\"", "14\"", "16\"", "18\"", "20\"", "22\"", "24\"", "26\"", "28\""];
  const colors = ["1B", "2", "4", "6", "8", "27", "30", "613", "1B/30", "4/27"];
  const textures = ["Straight", "Body Wave", "Deep Wave", "Loose Wave", "Curly"];

  const handleCheckboxChange = (filterType, value) => {
    const currentValues = filters[filterType] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    
    onFilterChange({
      ...filters,
      [filterType]: newValues,
    });
  };

  const handlePriceRangeChange = (range) => {
    // If clicking the same range, deselect it
    if (filters.priceMin === range.min && filters.priceMax === range.max) {
      onFilterChange({
        ...filters,
        priceMin: null,
        priceMax: null,
      });
    } else {
      onFilterChange({
        ...filters,
        priceMin: range.min,
        priceMax: range.max,
      });
    }
  };

  const clearFilters = () => {
    onFilterChange({
      category: [],
      priceMin: null,
      priceMax: null,
      length: [],
      color: [],
      texture: [],
    });
  };

  const FilterSection = ({ title, sectionKey, children }) => (
    <div className="border-b border-gray-200 pb-4 mb-4 last:border-0 last:mb-0">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between text-sm lg:text-base font-semibold text-gray-900 mb-3 hover:text-[#FF6B9D] transition"
      >
        <span>{title}</span>
        {openSections[sectionKey] ? (
          <HiChevronUp size={20} />
        ) : (
          <HiChevronDown size={20} />
        )}
      </button>
      <AnimatePresence>
        {openSections[sectionKey] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-base lg:text-lg font-bold text-gray-900">Filters</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={clearFilters}
            className="text-sm text-[#FF6B9D] hover:underline font-medium"
          >
            Clear all
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <HiX size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <FilterSection title="Category" sectionKey="category">
        <div className="space-y-2">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 cursor-pointer hover:text-[#FF6B9D] transition"
            >
              <input
                type="checkbox"
                checked={filters.category?.includes(category.slug) || false}
                onChange={() => handleCheckboxChange("category", category.slug)}
                className="w-4 h-4 text-[#FF6B9D] border-gray-300 rounded focus:ring-[#FF6B9D]"
              />
              <span className="text-sm text-gray-700">{category.name}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Filter */}
      <FilterSection title="Price" sectionKey="price">
        <div className="space-y-2">
          {priceRanges.map((range, index) => (
            <label
              key={index}
              className="flex items-center gap-2 cursor-pointer hover:text-[#FF6B9D] transition"
            >
              <input
                type="radio"
                name="priceRange"
                checked={
                  filters.priceMin === range.min && filters.priceMax === range.max
                }
                onChange={() => handlePriceRangeChange(range)}
                className="w-4 h-4 text-[#FF6B9D] border-gray-300 focus:ring-[#FF6B9D]"
              />
              <span className="text-sm text-gray-700">{range.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Length Filter */}
      <FilterSection title="Length" sectionKey="length">
        <div className="space-y-2">
          {lengths.map((length) => (
            <label
              key={length}
              className="flex items-center gap-2 cursor-pointer hover:text-[#FF6B9D] transition"
            >
              <input
                type="checkbox"
                checked={filters.length?.includes(length) || false}
                onChange={() => handleCheckboxChange("length", length)}
                className="w-4 h-4 text-[#FF6B9D] border-gray-300 rounded focus:ring-[#FF6B9D]"
              />
              <span className="text-sm text-gray-700">{length}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Color Filter */}
      <FilterSection title="Color" sectionKey="color">
        <div className="space-y-2">
          {colors.map((color) => (
            <label
              key={color}
              className="flex items-center gap-2 cursor-pointer hover:text-[#FF6B9D] transition"
            >
              <input
                type="checkbox"
                checked={filters.color?.includes(color) || false}
                onChange={() => handleCheckboxChange("color", color)}
                className="w-4 h-4 text-[#FF6B9D] border-gray-300 rounded focus:ring-[#FF6B9D]"
              />
              <span className="text-sm text-gray-700">{color}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Texture Filter */}
      <FilterSection title="Texture" sectionKey="texture">
        <div className="space-y-2">
          {textures.map((texture) => (
            <label
              key={texture}
              className="flex items-center gap-2 cursor-pointer hover:text-[#FF6B9D] transition"
            >
              <input
                type="checkbox"
                checked={filters.texture?.includes(texture) || false}
                onChange={() => handleCheckboxChange("texture", texture)}
                className="w-4 h-4 text-[#FF6B9D] border-gray-300 rounded focus:ring-[#FF6B9D]"
              />
              <span className="text-sm text-gray-700">{texture}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

