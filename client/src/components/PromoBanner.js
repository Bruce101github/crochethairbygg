"use client";

import { useState, useEffect, useRef } from "react";
import { HiX } from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const bannerRef = useRef(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [banners, setBanners] = useState([]);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    // Fetch banners from API
    fetch("http://127.0.0.1:8000/api/promo-banners/")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setBanners(data);
          // Initialize countdown for first banner if it has one
          if (data[0]?.has_countdown) {
            setTimeLeft({
              hours: data[0].countdown_hours || 0,
              minutes: data[0].countdown_minutes || 0,
              seconds: data[0].countdown_seconds || 0,
            });
          }
        }
      })
      .catch((err) => console.error("Error fetching promo banners:", err));
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (banners.length === 0) return;
    const currentBanner = banners[currentBannerIndex];
    if (!currentBanner?.has_countdown) return;

    // Initialize countdown from banner data
    setTimeLeft({
      hours: currentBanner.countdown_hours || 0,
      minutes: currentBanner.countdown_minutes || 0,
      seconds: currentBanner.countdown_seconds || 0,
    });

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }

        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentBannerIndex, banners]);

  // Auto-rotate banners every 5 seconds
  useEffect(() => {
    if (banners.length === 0) return;
    const rotateTimer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(rotateTimer);
  }, [banners.length]);

  // Effect to update CSS variable for banner height
  useEffect(() => {
    const updateHeight = () => {
      if (bannerRef.current && isVisible) {
        const height = bannerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--promo-banner-height', `${height}px`);
      } else {
        document.documentElement.style.setProperty('--promo-banner-height', '0px');
      }
    };

    // Initial update
    updateHeight();

    // Use ResizeObserver to detect size changes
    let resizeObserver;
    if (bannerRef.current && isVisible) {
      resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isVisible]);

  if (!isVisible || banners.length === 0) return null;

  const currentBanner = banners[currentBannerIndex];
  if (!currentBanner) return null;

  return (
    <div ref={bannerRef} data-promo-banner="true" className="bg-black text-white py-2 px-2 lg:px-4 fixed top-0 left-0 right-0 z-[1001] w-full border-b border-gray-800 min-h-[45px]">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={currentBannerIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-7xl mx-auto flex items-center justify-between text-sm lg:text-base gap-2 h-full"
        >
          <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
            <span className="font-semibold truncate hidden sm:inline whitespace-nowrap">{currentBanner.text}</span>
            <span className="font-semibold truncate sm:hidden whitespace-nowrap">{currentBanner.mobile_text || currentBanner.text}</span>
            {currentBanner.has_countdown && (
              <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
                <span className="bg-white text-black px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-sm lg:text-base font-bold">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="text-sm">:</span>
                <span className="bg-white text-black px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-sm lg:text-base font-bold">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="text-sm">:</span>
                <span className="bg-white text-black px-1.5 lg:px-2 py-0.5 lg:py-1 rounded text-sm lg:text-base font-bold">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
          <Link
            href={currentBanner.cta_link || "/products"}
            className="bg-white text-black px-2 lg:px-3 py-1 rounded text-sm lg:text-base font-semibold hover:bg-gray-100 transition flex-shrink-0"
          >
            <span className="hidden sm:inline">{currentBanner.cta_text || "Get Now"}</span>
            <span className="sm:hidden">Go</span>
          </Link>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
