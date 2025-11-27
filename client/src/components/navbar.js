"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, Heart, ShoppingBag, UserRound, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { GH, US, EU, GB, NG, ZA, AE, CA } from "country-flag-icons/react/1x1";
import {motion, AnimatePresence} from "motion/react";

export default function Navbar() {
  const pathname = usePathname();
  const [currencyMenu, setCurrencyMenu] = useState(false);
  const [currency, setCurrency] = useState("GH");
  const [language, setLanguage] = useState("EN");
  const [sideMenuOpen, setSideMenuOpen] = useState(false)


  useEffect(() => {
}, [currency]);

const currencyOptions = [
    { code: "GH", label: "GHS", flag: <GH />},
    { code: "NG", label: "NGN", flag: <NG />},
    { code: "ZA", label: "ZAR", flag: <ZA />},
    { code: "US", label: "USD", flag: <US />},
    { code: "GB", label: "GBP", flag: <GB />},
    { code: "EU", label: "EUR", flag: <EU />},
    { code: "AE", label: "AED", flag: <AE />},
    { code: "CA", label: "CAD", flag: <CA />},
  ];

const languageOptions = [
    { code: "EN", label: "English" },
    { code: "FR", label: "Francais" },
  ];

  return (
    <>
    <div className="w-full h-auto fixed bg-white px-5 lg:px-20 py-4 flex items-center justify-between">
      <span className="flex gap-10 items-center">
        <Link href="/">
          <Image
            className="h-10 w-25"
            src="/CrochetHairbyGG-logo.png"
            alt="CrochetHair by GG logo"
            height={50}
            width={50}
          />
        </Link>
        <nav className="hidden lg:flex gap-5 text-black">
          <Link href="/" className="relative">
            Home{" "}
            <div
              className={
                pathname === "/" ? "absolute right-0 bottom-0" : "hidden"
              }
            >
              <Image
                src="/crochet-pin.svg"
                alt="crochet pin"
                width={35}
                height={5}
              />
            </div>
          </Link>
          <Link href="/products" className="relative">
            Products
            <div
              className={
                pathname === "/products"
                  ? "absolute right-0 bottom-0"
                  : "hidden"
              }
            >
              <Image
                src="/crochet-pin.svg"
                alt="crochet pin"
                width={35}
                height={5}
              />
            </div>
          </Link>
          <Link href="/about" className="relative">
            About
            <div
              className={
                pathname === "/about" ? "absolute right-0 bottom-0" : "hidden"
              }
            >
              <Image
                src="/crochet-pin.svg"
                alt="crochet pin"
                width={35}
                height={5}
              />
            </div>
          </Link>
          <Link href="/contact" className="relative">
            Contact
            <div
              className={
                pathname === "/contact" ? "absolute right-0 bottom-0" : "hidden"
              }
            >
              <Image
                src="/crochet-pin.svg"
                alt="crochet pin"
                width={35}
                height={5}
              />
            </div>
          </Link>
          <Link href="/blog" className="relative">
            Blog
            <div
              className={
                pathname === "/blog" ? "absolute right-0 bottom-0" : "hidden"
              }
            >
              <Image
                src="/crochet-pin.svg"
                alt="crochet pin"
                width={35}
                height={5}
              />
            </div>
          </Link>
          <Link href="/track" className="relative">
            Track
            <div
              className={
                pathname === "/track" ? "absolute right-0 bottom-0" : "hidden"
              }
            >
              <Image
                src="/crochet-pin.svg"
                alt="crochet pin"
                width={35}
                height={5}
              />
            </div>
          </Link>
        </nav>
      </span>
      <span className="flex gap-4 text-black items-center">
        <div className="hidden lg:block relative bg-black/5 rounded-3xl text-black py-2 pl-4 pr-10 w-150">
          <input
            className="w-full placeholder:text-black/40 focus:outline-none"
            placeholder="what are you looking for ?"
          />
          <button className="absolute right-4 text-black/40">
            <Search />
          </button>
        </div>
        <button>
          <Heart />
        </button>
        <button className="relative">
          <ShoppingBag />
          <span className="absolute -top-2 -right-2 h-5 w-5  bg-red-400 text-white text-sm rounded-full">
            0
          </span>
        </button>
        <button className="hidden lg:block">
          <UserRound />
        </button>
       <button onClick={()=>setCurrencyMenu(prev => !prev)} className="hidden relative lg:block rounded-full h-7 w-7 bg-black/5 overflow-hidden">
            {currencyOptions.find(option => option.code === currency)?.flag}
        </button>
        <div className={currencyMenu === true ? "absolute flex flex-col gap-2 top-18 right-10 p-4 bg-white rounded-b-xl" : "hidden"}> 
          <label htmlFor="currency">Currency</label>
          <div id="currency" className="flex flex-col gap-2 mb-2">
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="GH"><GH className="w-8 h-5"/> <p>GHS</p></button>
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="NG"><NG className="w-8 h-5"/> <p>NGN</p></button>
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="ZA"><ZA className="w-8 h-5"/> <p>ZAR</p></button>
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="US"><US className="w-8 h-5"/> <p>USD</p></button>
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="GB"><GB className="w-8 h-5"/> <p>GBP</p></button>
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="EU"><EU className="w-8 h-5"/> <p>EUR</p></button>
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="AE"><AE className="w-8 h-5"/> <p>AED</p></button>
          <button onClick={(e) => setCurrency(e.currentTarget.value)} className="flex gap-1" value="CA"><CA className="w-8 h-5"/> <p>CAD</p></button>
          </div>
          <label htmlFor="language">Language</label>
          <div id="language" className="flex flex-col gap-2 mb-2">
            <button>English</button>
            <button>Francais</button>
            </div>
        </div>
        <button  onClick={() => setSideMenuOpen(prev => !prev)} className="lg:hidden">
          <Menu />
        </button>
      </span>  
    </div>
    <AnimatePresence>{sideMenuOpen && (
  <motion.div initial={{x: "100%"}} animate={{x: "30%"}} exit={{x: "100%"}} transition={{ease: ["easeIn", "easeOut"]}} className="absolute right-0 bg-white w-full h-full z-100 pr-[35%]">
              <button  onClick={() => setSideMenuOpen(prev => !prev)} className="fixed top-6 right-[35%] text-black"><X /></button>
              <button className="flex gap-1 text-black mt-5 ml-5"><UserRound /> Sign in</button>
      <nav className="flex flex-col gap-5 text-black mt-20 ml-5 text-3xl">
          <Link href="/" className="relative" onClick={() => setSideMenuOpen(false)}>
            Home
          </Link>
          <Link href="/products" className="relative" onClick={() => setSideMenuOpen(false)}>
            Products
          </Link>
          <Link href="/about" className="relative" onClick={() => setSideMenuOpen(false)}>
            About
          </Link>
          <Link href="/contact" className="relative" onClick={() => setSideMenuOpen(false)}>
            Contact
          </Link>
          <Link href="/blog" className="relative" onClick={() => setSideMenuOpen(false)}>
            Blog
          </Link>
          <Link href="/track" className="relative" onClick={() => setSideMenuOpen(false)}>
            Track
          </Link>
        </nav>
        </motion.div>)}</AnimatePresence>
    </>
  );
}
