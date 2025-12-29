"use client"

import { GH } from "country-flag-icons/react/1x1";
import { HiChevronDown, HiPlus, HiMinus, HiMoon, HiSun } from "react-icons/hi";
import Image from "next/image";
import Link from "next/link";
import {useState, useEffect} from "react";
import { useTheme } from "@/context/ThemeContext";

export default function Footer() {
    const { theme, toggleTheme } = useTheme();
    const [windowWidth, setWindowWidth] = useState(undefined); 
    const [nav1Open, setNav1Open] = useState(false);
    const [navOpen, setNavOpen] = useState({
        productsOpen : false,
        aboutOpen : false,
        helpOpen : false,
        linksOpen : false

    })

    const handleNav = (nav) => {
      setNavOpen(prev => ({ ...prev, [nav]: !prev[nav] }));
    };


  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);

    // Clean up listener on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);




  return (
    <div className="w-full h-auto bg-black px-5 lg:px-20 py-10 flex flex-col  justify-between text-white lg:gap-5">
      <div className="h-px w-full bg-white/10 my-5"></div>
      <div className="flex w-full justify-between lg:flex-row flex-col  gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between lg:block"><label className="font-bold flex justify-between lg:block">Products</label> <button onClick={() => handleNav("productsOpen")} className="block lg:hidden">{navOpen.productsOpen ? <HiMinus /> : <HiPlus />}</button></div>
          { navOpen.productsOpen || windowWidth > 768 ? (<nav className="flex flex-col gap-2 text-sm">
            <Link href="/products" className="hover:text-[#FF6B9D] transition">
              Hair Extensions
            </Link>
            <Link href="/products" className="hover:text-[#FF6B9D] transition">
              Braided Wig Caps
            </Link>
            <Link href="/products" className="hover:text-[#FF6B9D] transition">
              Wig Bundles
            </Link>
            <Link href="/products" className="hover:text-[#FF6B9D] transition">
              Closure
            </Link>
          </nav>) : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between lg:block"><label className="font-bold">About Us</label><button onClick={() => handleNav("aboutOpen")} className="block lg:hidden">{navOpen.aboutOpen ? <HiMinus /> : <HiPlus />}</button></div>
          {navOpen.aboutOpen || windowWidth > 768 ? (<nav className="flex flex-col gap-2 text-sm">
            <Link href="/about" className="hover:text-[#FF6B9D] transition">
              About
            </Link>
            <Link href="/blog" className="hover:text-[#FF6B9D] transition">
              Blog
            </Link>
            <Link href="/contact" className="hover:text-[#FF6B9D] transition">
              FAQ
            </Link>
            <Link href="/products" className="hover:text-[#FF6B9D] transition">
              Reviews
            </Link>
          </nav>) : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between lg:block"><label className="font-bold">Help</label> <button onClick={() => handleNav("helpOpen")} className="block lg:hidden">{navOpen.helpOpen ? <HiMinus /> : <HiPlus />}</button></div>
          {navOpen.helpOpen || windowWidth > 768 ? (<nav className="flex flex-col gap-2 text-sm">
            <Link href="/track" className="hover:text-[#FF6B9D] transition">
              Track Order
            </Link>
            <Link href="/contact" className="hover:text-[#FF6B9D] transition">
              Find Hairstylist
            </Link>
            <Link href="/contact" className="hover:text-[#FF6B9D] transition">
              Shipping & Returns
            </Link>
            <Link href="/about" className="hover:text-[#FF6B9D] transition">
              Safety and Quality
            </Link>
          </nav>) : null}
        </div>{" "}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between lg:block"><label className="font-bold flex justify-between lg:block">Links</label><button onClick={() => handleNav("linksOpen")} className="block lg:hidden">{navOpen.linksOpen ? <HiMinus /> : <HiPlus />}</button></div>
          { navOpen.linksOpen || windowWidth > 768 ? (<nav className="flex flex-col gap-2 text-sm">
            <Link href="/contact" className="hover:text-[#FF6B9D] transition">
              Privacy Policy
            </Link>
            <Link href="/contact" className="hover:text-[#FF6B9D] transition">
              Return
            </Link>
            <Link href="/contact" className="hover:text-[#FF6B9D] transition">
              Terms & Conditions
            </Link>
            <Link href="/products" className="hover:text-[#FF6B9D] transition">
              Our Site Map
            </Link>
          </nav>) : null}
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="font-bold">Contact Us</label>
            <div  className="text-sm">
              <p>Email: inf@museira.com</p>
              <p>Phone: 123-456-7890</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-bold">Shopping from:</label>
            <div className="flex gap-1.5 items-center text-sm">
              You are in{" "}
              <div className="w-5 h-5 rounded-full overflow-hidden">
                <GH />
              </div>
              <HiChevronDown size={14} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="font-bold">Settings</label>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-sm hover:text-[#FF6B9D] transition text-left"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <>
                  <HiSun size={18} />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <HiMoon size={18} />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="h-px w-full bg-white/10 my-5"></div>
      <div className="flex gap-2 justify-center">
        <div className="w-10 h-6 rounded-sm bg-white/20 overflow-hidden">
          <Image
            src="payment-icons/visa.svg"
            alt="visa"
            width={64}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-10 h-6 rounded-sm bg-white/20 overflow-hidden">
          <Image
            src="payment-icons/mastercard.svg"
            alt="mastercard"
            width={64}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-10 h-6 rounded-sm bg-white/20 overflow-hidden">
          <Image
            src="payment-icons/mtn.svg"
            alt="mtn"
            width={64}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-10 h-6 rounded-sm bg-white/20 overflow-hidden">
          <Image
            src="payment-icons/telecel.svg"
            alt="gh link"
            width={64}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-10 h-6 rounded-sm bg-white/20 overflow-hidden">
          <Image
            src="payment-icons/airteltigo.svg"
            alt="gh link"
            width={64}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="flex lg:flex-row justify-between w-full text-xs gap-2">
        <span>Copyright@2025 Museira</span>
        <span>
          Website Created by <a href="https://instagram.com/brucethiombiano" target="_blank" className="text-[#FF6B9D] hover:underline">Bruce T.</a>
        </span>
      </div>
    </div>
  );
}
