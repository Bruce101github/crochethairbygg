"use client";

import { useEffect, useState, useCallback } from "react";
import { HiTruck, HiPhone, HiExternalLink } from "react-icons/hi";

const STATUS_FLOW = ["scheduled", "pending", "assigned", "in_transit", "delivered"];
const STATUS_LABEL = {
  scheduled: "Scheduled",
  pending: "Finding a rider",
  assigned: "Rider assigned",
  in_transit: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Polls /api/orders/<id>/delivery and renders live courier status.
 * Renders nothing if the order has no delivery. Stops polling at a
 * terminal status (delivered/cancelled).
 */
export default function DeliveryTracking({ orderId, guestEmail, authToken }) {
  const [delivery, setDelivery] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const fetchDelivery = useCallback(async () => {
    try {
      const qs = guestEmail ? `?guest_email=${encodeURIComponent(guestEmail)}` : "";
      const headers = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/orders/${orderId}/delivery/${qs}`,
        { headers }
      );
      setDelivery(res.ok ? await res.json() : null);
    } catch {
      // keep last-known state
    } finally {
      setLoaded(true);
    }
  }, [orderId, guestEmail, authToken]);

  useEffect(() => {
    fetchDelivery();
    if (delivery && ["delivered", "cancelled"].includes(delivery.status)) return;
    const id = setInterval(fetchDelivery, 20000);
    return () => clearInterval(id);
  }, [fetchDelivery, delivery?.status]);

  if (!loaded || !delivery) return null;

  const cancelled = delivery.status === "cancelled";
  const currentIdx = STATUS_FLOW.indexOf(delivery.status);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <HiTruck className="text-[#C8961F]" /> Delivery
        </h3>
        <span
          className={`text-sm font-medium ${
            cancelled ? "text-red-600" : "text-[#C8961F]"
          }`}
        >
          {STATUS_LABEL[delivery.status] || delivery.status}
        </span>
      </div>

      {!cancelled && (
        <div className="flex items-center gap-1 mb-4" aria-hidden="true">
          {STATUS_FLOW.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i <= currentIdx
                  ? "bg-[#C8961F]"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
        {delivery.courier_name && (
          <div className="flex items-center justify-between">
            <span>Rider: {delivery.courier_name}</span>
            {delivery.courier_phone && (
              <a
                href={`tel:${delivery.courier_phone}`}
                className="flex items-center gap-1 text-[#C8961F] hover:underline"
              >
                <HiPhone /> Call
              </a>
            )}
          </div>
        )}
        {delivery.duration_minutes ? (
          <span>Estimated arrival: ~{delivery.duration_minutes} min</span>
        ) : null}
      </div>

      {delivery.tracking_url && (
        <a
          href={delivery.tracking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#C8961F] px-4 py-2 text-sm font-semibold text-[#231F20] transition hover:bg-[#A87814]"
        >
          Track live <HiExternalLink />
        </a>
      )}
    </div>
  );
}
