"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { HiCreditCard, HiLockClosed, HiShieldCheck } from "react-icons/hi";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId;
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [initializing, setInitializing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card"); // "card" or "mobile_money"
  const [orderDetails, setOrderDetails] = useState(null);
  const [paystackReady, setPaystackReady] = useState(false);
  const paystackRef = useRef(null);

  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  });

  useEffect(() => {
    // Fetch order details first
    async function fetchOrderDetails() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const guestEmail = searchParams.get("guest_email");

        const headers = {
          "Content-Type": "application/json",
        };

        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }

        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/`;
        if (!accessToken && guestEmail) {
          // Use guest order tracking endpoint
          url = `${process.env.NEXT_PUBLIC_API_URL}/api/orders/track/?order_id=${orderId}&email=${encodeURIComponent(guestEmail)}`;
        }

        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          setOrderDetails(data);
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    }

    fetchOrderDetails();

    // Load Paystack script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      setPaystackReady(true);
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector(
        'script[src="https://js.paystack.co/v1/inline.js"]'
      );
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [orderId, accessToken]);

  async function initializePayment() {
    // Prevent duplicate initialization
    if (initializing || paymentData) {
      return;
    }

    setInitializing(true);
    try {
      // Get guest email from URL params if guest checkout
      const searchParams = new URLSearchParams(window.location.search);
      const guestEmail = searchParams.get("guest_email");

      const headers = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const body = guestEmail
        ? { guest_email: guestEmail, payment_channel: paymentMethod }
        : { payment_channel: paymentMethod };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/paystack/initiate/${orderId}/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (res.ok && data.access_code && data.public_key) {
        setPaymentData(data);
        setLoading(false);
      } else {
        // Handle duplicate payment error specifically
        if (data.message && data.message.includes("Duplicate charge request")) {
          toast.error(
            "Payment already initialized. Please check your email or try refreshing the page.",
            {
              duration: 5000,
            }
          );
          // Still try to show payment data if available, or redirect
          setTimeout(() => {
            router.push("/checkout");
          }, 3000);
        } else {
          toast.error(
            data.error || data.message || "Failed to initialize payment"
          );
          setTimeout(() => {
            router.push("/checkout");
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Error initializing payment");
      setTimeout(() => {
        router.push("/checkout");
      }, 2000);
    } finally {
      setInitializing(false);
    }
  }

  function handlePayment() {
    if (!paymentData || typeof window === "undefined" || !window.PaystackPop) {
      toast.error("Payment system not ready. Please try again.");
      return;
    }

    // Prevent multiple clicks
    if (processing) {
      return;
    }

    setProcessing(true);

    const handler = window.PaystackPop.setup({
      key: paymentData.public_key,
      email: paymentData.email,
      amount: paymentData.amount,
      ref: paymentData.reference,
      currency: "GHS",
      channels: [paymentMethod], // Use selected payment method
      callback: function (response) {
        // Payment successful
        setProcessing(false);
        toast.success("Payment successful! Processing your order...");

        // Redirect to success page
        router.push(`/payment-success?reference=${paymentData.reference}`);
      },
      onClose: function () {
        // User closed the payment modal
        setProcessing(false);
        toast.error("Payment was cancelled");
      },
    });

    handler.openIframe();
  }

  if (loading && !paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Initializing payment...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6B9D] mx-auto"></div>
        </div>
      </div>
    );
  }

  // Get order amount from orderDetails or paymentData
  const amountInGHS = paymentData
    ? (paymentData.amount / 100).toFixed(2)
    : orderDetails
      ? parseFloat(orderDetails.total || 0).toFixed(2)
      : "0.00";

  return (
    <div className="min-h-screen pb-20 px-5 lg:px-40">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-[#FF6B9D]/10 p-4 rounded-full">
                <HiCreditCard size={48} className="text-[#FF6B9D]" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Complete Your Payment</h1>
            <p className="text-gray-600">Secure payment powered by Paystack</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Order ID</span>
              <span className="font-semibold">#{orderId}</span>
            </div>
            {paymentData && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Email</span>
                <span className="font-semibold">{paymentData.email}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-[#FF6B9D]">
                  {orderDetails || paymentData
                    ? `GH₵${amountInGHS}`
                    : "Loading..."}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  paymentMethod === "card"
                    ? "border-[#FF6B9D] bg-[#FF6B9D]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <HiCreditCard
                    size={24}
                    className={
                      paymentMethod === "card"
                        ? "text-[#FF6B9D]"
                        : "text-gray-400"
                    }
                  />
                  <span
                    className={`text-sm font-medium ${paymentMethod === "card" ? "text-[#FF6B9D]" : "text-gray-600"}`}
                  >
                    Card
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("mobile_money")}
                className={`p-4 border-2 rounded-lg transition-all ${
                  paymentMethod === "mobile_money"
                    ? "border-[#FF6B9D] bg-[#FF6B9D]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className={`w-6 h-6 ${paymentMethod === "mobile_money" ? "text-[#FF6B9D]" : "text-gray-400"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span
                    className={`text-sm font-medium ${paymentMethod === "mobile_money" ? "text-[#FF6B9D]" : "text-gray-600"}`}
                  >
                    Mobile Money
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <HiLockClosed size={20} className="text-[#FF6B9D]" />
              <span>Your payment is secured and encrypted</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <HiShieldCheck size={20} className="text-[#FF6B9D]" />
              <span>
                We never store your{" "}
                {paymentMethod === "card" ? "card" : "payment"} details
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (!paymentData) initializePayment();
              else handlePayment();
            }}
            disabled={processing || initializing}
            className="w-full bg-[#FF6B9D] text-white py-4 rounded-lg font-semibold text-lg hover:bg-[#FF5A8A] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing || initializing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {initializing ? "Initializing..." : "Processing..."}
              </>
            ) : (
              <>
                <HiCreditCard size={20} />
                {paymentData ? `Pay GH₵${amountInGHS}` : "Initialize Payment"}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-4">
            By clicking "Pay", you will be redirected to a secure payment page
          </p>
        </div>
      </div>
    </div>
  );
}
