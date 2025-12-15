import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PromoBanner from "@/components/PromoBanner";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "Crochet Hair by GG | Premium Hair Extensions & Wigs",
  description: "Discover our collection of high-quality wigs, extensions, and hair accessories. 100% Human Hair | Free Shipping | 30-Day Returns",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <PromoBanner />
            <Navbar />
            <Toaster position="top-right" reverseOrder={false} />
            <main className="bg-white dark:bg-gray-900 min-h-screen transition-colors" style={{ paddingTop: 'var(--header-total-height, 100px)' }}>
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
