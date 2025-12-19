"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  HiShoppingBag,
  HiArrowRight,
  HiChevronLeft,
  HiChevronRight,
  HiStar,
} from "react-icons/hi";
import Listing from "@/components/listing";
import TrustBadges from "@/components/TrustBadges";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [windowWidth, setWindowWidth] = useState(0);
  const [currentCategoryPage, setCurrentCategoryPage] = useState(0);

  useEffect(() => {
    // Set initial window width
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
    }

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/products/?ordering=-base_price`
    )
      .then((res) => res.json())
      .then((data) => {
        setFeaturedProducts(data.slice(0, 8));
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch categories
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/`)
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Error fetching categories:", err));

    // Fetch hero slides
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-slides/`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          // Filter only active slides and sort by order
          const activeSlides = data
            .filter((slide) => slide.is_active)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setHeroSlides(activeSlides);
        }
      })
      .catch((err) => console.error("Error fetching hero slides:", err));
  }, []);

  // Handle window resize for responsive images
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-rotate hero slides every 6 seconds
  useEffect(() => {
    if (heroSlides.length === 0) return;

    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 6000);

    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  // Auto-rotate categories every 8 seconds (showing 6 categories at a time on mobile - 3 columns x 2 rows)
  useEffect(() => {
    if (categories.length === 0) return;

    const categoriesPerRow = 3; // 3 columns per row on mobile
    const rowsPerPage = 2; // 2 rows
    const categoriesPerPage = categoriesPerRow * rowsPerPage; // 3 columns x 2 rows = 6 categories
    const totalPages = Math.ceil(categories.length / categoriesPerPage);

    if (totalPages <= 1) return; // No need to rotate if all fit on one page

    const categoryTimer = setInterval(() => {
      setCurrentCategoryPage((prev) => (prev + 1) % totalPages);
    }, 8000); // 8 seconds

    return () => clearInterval(categoryTimer);
  }, [categories.length]);

  const goToSlide = (index) => {
    setCurrentHeroIndex(index);
  };

  const nextSlide = () => {
    if (heroSlides.length === 0) return;
    setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    if (heroSlides.length === 0) return;
    setCurrentHeroIndex(
      (prev) => (prev - 1 + heroSlides.length) % heroSlides.length
    );
  };

  function priceRange(variants) {
    if (!variants || variants.length === 0) return "₵0";
    const prices = variants.map((variant) => variant.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice
      ? `₵${minPrice}`
      : `₵${minPrice} - ₵${maxPrice}`;
  }

  return (
    <div
      className="min-h-screen -mt-[var(--header-total-height,100px)]"
      style={{ position: "relative", zIndex: 1 }}
    >
      {/* Hero Section - starts from top of screen */}
      <section
        className="relative w-full h-[70vh] lg:h-[70vh] flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-50 overflow-hidden"
        style={{
          marginTop: 0,
          paddingTop: "var(--header-total-height, 100px)",
        }}
      >
        {/* Slide Container */}
        {heroSlides.length > 0 ? (
          <div className="relative w-full h-full">
            {heroSlides.map((slide, index) => {
              // Determine which image to use based on screen size
              // Priority: mobile_image (mobile) -> tablet_image (tablet) -> background_image (desktop)
              const getImageUrl = () => {
                const width =
                  windowWidth ||
                  (typeof window !== "undefined" ? window.innerWidth : 1024);
                if (width < 768 && slide.mobile_image_url) {
                  return slide.mobile_image_url;
                } else if (
                  width >= 768 &&
                  width < 1024 &&
                  slide.tablet_image_url
                ) {
                  return slide.tablet_image_url;
                }
                return slide.background_image_url;
              };

              const imageUrl = getImageUrl();

              return (
                <div
                  key={slide.id || index}
                  className={`relative flex items-center justify-center transition-all duration-500 ease-in-out${
                    index === currentHeroIndex
                      ? "translate-x-0 opacity-100 z-10  w-full h-full"
                      : index < currentHeroIndex
                        ? "-translate-x-full opacity-0 z-0"
                        : "translate-x-full opacity-0 z-0"
                  }`}
                >
                  {imageUrl && imageUrl.toLowerCase().endsWith(".gif") ? (
                    <Image
                      src={imageUrl}
                      alt={slide.title || "Hero slide image"}
                      fill
                      className="absolute inset-0 w-full h-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: imageUrl
                          ? `url(${imageUrl})`
                          : undefined,
                        backgroundSize: "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: imageUrl ? "transparent" : undefined,
                      }}
                    />
                  )}
                  <div className="relative z-10 text-center px-5 max-w-5xl w-full">
                    <h1 className="hidden text-2xl lg:text-5xl font-bold mb-6 text-black leading-tight drop-shadow-lg">
                      <span className="block">{slide.title}</span>
                      {slide.subtitle && (
                        <span className="block text-[#FF6B9D]">
                          {slide.subtitle}
                        </span>
                      )}
                    </h1>
                    {slide.description && (
                      <p className="text-base lg:text-lg text-gray-700 mb-10 max-w-2xl mx-auto drop-shadow-md">
                        {slide.description}
                      </p>
                    )}
                    <div className="hidden flex-col sm:flex-row gap-4 justify-center items-center ">
                      {slide.cta1_text && slide.cta1_link && (
                        <Link
                          href={slide.cta1_link}
                          className="inline-flex items-center justify-center gap-2 bg-[#FF6B9D] text-white px-10 py-4 rounded-lg font-bold text-base lg:text-lg hover:bg-[#FF5A8A] transition shadow-lg hover:shadow-xl"
                        >
                          {slide.cta1_text}
                          <HiArrowRight size={20} />
                        </Link>
                      )}
                      {slide.cta2_text && slide.cta2_link && (
                        <Link
                          href={slide.cta2_link}
                          className="inline-flex items-center justify-center gap-2 border-2 border-[#FF6B9D] text-[#FF6B9D] px-10 py-4 rounded-lg font-bold text-base lg:text-lg hover:bg-[#FF6B9D]/10 transition"
                        >
                          {slide.cta2_text}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="text-center px-5 max-w-5xl w-full">
              <h1 className="text-2xl lg:text-5xl font-bold mb-6 text-black leading-tight">
                <span className="block">Premium Hair Extensions</span>
                <span className="block text-[#FF6B9D]">For Every Style</span>
              </h1>
              <p className="text-base lg:text-lg text-gray-700 mb-10 max-w-2xl mx-auto">
                Discover our collection of high-quality wigs, extensions, and
                hair accessories.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 bg-[#FF6B9D] text-white px-10 py-4 rounded-lg font-bold text-base lg:text-lg hover:bg-[#FF5A8A] transition shadow-lg hover:shadow-xl"
                >
                  Shop Now
                  <HiArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Arrows - Only show if there are multiple slides */}
        {heroSlides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition hover:scale-110"
              aria-label="Previous slide"
            >
              <HiChevronLeft size={24} className="text-[#FF6B9D]" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition hover:scale-110"
              aria-label="Next slide"
            >
              <HiChevronRight size={24} className="text-[#FF6B9D]" />
            </button>
          </>
        )}

        {/* Slide Indicators - Only show if there are multiple slides */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentHeroIndex
                    ? "w-8 bg-[#FF6B9D]"
                    : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Categories Section */}
      {categories.length > 0 &&
        (() => {
          const categoriesPerRow = 3; // 3 columns per row on mobile
          const rowsPerPage = 2; // 2 rows
          const categoriesPerPage = categoriesPerRow * rowsPerPage; // 3 columns x 2 rows = 6 categories
          const totalPages = Math.ceil(categories.length / categoriesPerPage);
          const pageStart = currentCategoryPage * categoriesPerPage;
          const pageCategories = categories.slice(
            pageStart,
            pageStart + categoriesPerPage
          );

          return (
            <section className="py-8 lg:py-16 px-2 md:px-5 lg:px-40 bg-white dark:bg-gray-900 transition-colors">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white">
                    Shop by Category
                  </h2>
                </div>
                <Link
                  href="/products"
                  className="text-[#FF6B9D] hover:underline font-semibold flex items-center gap-1 text-xs lg:text-base"
                >
                  View All
                  <HiArrowRight size={14} className="lg:w-4 lg:h-4" />
                </Link>
              </div>

              {/* Mobile: Grid with multiple columns and 2 rows, auto-rotating */}
              <div className="lg:hidden relative overflow-hidden w-full">
                {/* Auto-rotating viewport showing 6 categories (3 columns x 2 rows) */}
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${(currentCategoryPage * 100) / totalPages}%)`,
                    width: `${totalPages * 100}%`,
                  }}
                >
                  {Array.from({ length: totalPages }).map((_, pageIndex) => {
                    const pageStart = pageIndex * categoriesPerPage;
                    const pageCategories = categories.slice(
                      pageStart,
                      pageStart + categoriesPerPage
                    );

                    return (
                      <div
                        key={pageIndex}
                        className="flex-shrink-0"
                        style={{ width: `${100 / totalPages}%` }}
                      >
                        <div className="grid grid-cols-3 gap-3 px-1">
                          {pageCategories.map((category) => (
                            <Link
                              key={category.id}
                              href={`/products?category=${category.slug}`}
                              className="flex flex-col items-center group"
                            >
                              {/* Category Image/Icon - Bigger and Round */}
                              <div className="w-[120px] h-[120px] mb-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:opacity-80 transition shadow-sm">
                                {category.image_url ? (
                                  <Image
                                    src={category.image_url}
                                    alt={category.name}
                                    width={120}
                                    height={120}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  <HiShoppingBag
                                    size={48}
                                    className="text-[#FF6B9D]"
                                  />
                                )}
                              </div>
                              {/* Category Name - Bigger */}
                              <h3 className="text-xs text-gray-900 dark:text-white text-center leading-tight group-hover:text-[#FF6B9D] transition font-medium px-1">
                                {category.name}
                              </h3>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Page indicators for mobile auto-rotate */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-1.5 mt-6">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentCategoryPage(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentCategoryPage
                            ? "w-6 bg-[#FF6B9D]"
                            : "w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                        }`}
                        aria-label={`Go to category page ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop: Grid layout - Bigger cards and Round */}
              <div className="hidden lg:grid lg:grid-cols-6 gap-4">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="group flex flex-col items-center"
                  >
                    {/* Category Image/Icon - Bigger and Round */}
                    <div className="w-32 h-32 mb-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:opacity-80 transition shadow-md">
                      {category.image_url ? (
                        <Image
                          src={category.image_url}
                          alt={category.name}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <HiShoppingBag size={64} className="text-[#FF6B9D]" />
                      )}
                    </div>
                    {/* Category Name - Bigger */}
                    <h3 className="text-base font-medium text-gray-900 dark:text-white text-center group-hover:text-[#FF6B9D] transition">
                      {category.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          );
        })()}

      {/* Featured Products */}
      <section className="py-16 px-2 md:px-5 lg:px-40 bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              Featured Products
            </h2>
          </div>
          <Link
            href="/products"
            className="text-[#FF6B9D] hover:underline font-semibold flex items-center gap-1 text-xs lg:text-base"
          >
            View All
            <HiArrowRight size={14} className="lg:w-4 lg:h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-900 dark:text-white">
              Loading featured products...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-6">
            {featuredProducts.map((product) => (
              <Link
                href={`/products/${product.id}`}
                key={product.id}
                className="rounded text-black dark:text-white hover:shadow-lg transition"
              >
                <div className="relative">
                  <Image
                    src={product.images?.[0]?.image_url || "/placeholder.jpg"}
                    alt={product.title}
                    width={300}
                    height={300}
                    className="object-cover w-full lg:h-80 h-50 rounded"
                    unoptimized
                  />
                </div>
                <div className="p-2 flex flex-col">
                  <h3 className="font-medium text-base lg:text-lg whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-[200px] lg:max-w-[300px] text-gray-900 dark:text-white">
                    {product.title}
                  </h3>
                  {product.variants.length > 1 && (
                    <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                      options:{" "}
                      <span className="text-[#FF6B9D] font-semibold">
                        {product.variants.length} sizes
                      </span>
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-base lg:text-xl text-gray-900 dark:text-white">
                      {priceRange(product.variants)}
                    </p>
                    <button className="w-fit bg-[#FF6B9D]/10 text-[#FF6B9D] p-1.5 rounded-full flex items-center justify-center gap-2 hover:bg-[#FF6B9D] hover:text-white transition">
                      <HiShoppingBag size={16} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* All Products Section */}
      <section className="py-16 px-2 md:px-5 lg:px-40 bg-white dark:bg-gray-900 transition-colors">
        <h2 className="text-xl lg:text-2xl font-bold mb-8 text-gray-900 dark:text-white">
          All Products
        </h2>
        <Listing />
      </section>

      {/* Features Section */}
      <section className="py-16 px-5 lg:px-40 bg-white dark:bg-gray-900 transition-colors">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-[#FF6B9D]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiShoppingBag size={32} className="text-[#FF6B9D]" />
            </div>
            <h3 className="font-bold text-base lg:text-lg mb-2 text-gray-900 dark:text-white">
              Free Shipping
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Free delivery on all orders within Accra
            </p>
          </div>
          <div className="text-center">
            <div className="bg-[#FF6B9D]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiStar size={32} className="text-[#FF6B9D]" />
            </div>
            <h3 className="font-bold text-base lg:text-lg mb-2 text-gray-900 dark:text-white">
              Premium Quality
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              Top-quality hair products guaranteed
            </p>
          </div>
          <div className="text-center">
            <div className="bg-[#FF6B9D]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <HiArrowRight size={32} className="text-[#FF6B9D]" />
            </div>
            <h3 className="font-bold text-base lg:text-lg mb-2 text-gray-900 dark:text-white">
              Easy Returns
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-base">
              30-day return policy on all products
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
