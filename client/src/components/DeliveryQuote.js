"use client";

import { useEffect, useRef, useState } from "react";
import { HiTruck, HiLocationMarker } from "react-icons/hi";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (window.__gmapsPromise) return window.__gmapsPromise;
  window.__gmapsPromise = new Promise((resolve, reject) => {
    if (!GOOGLE_KEY) {
      reject(new Error("missing key"));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.google);
    s.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(s);
  });
  return window.__gmapsPromise;
}

/**
 * Captures a drop-off address via Google Places, fetches a Mckot delivery
 * quote from our backend, and lets the customer pick a ride type.
 * Calls onChange({ coordinates, ride_type_id, fee, eta, address }) as it updates.
 */
export default function DeliveryQuote({ onChange }) {
  const inputRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const [addressText, setAddressText] = useState("");
  const [quote, setQuote] = useState(null);
  const [options, setOptions] = useState([]);
  const [rideTypeId, setRideTypeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!GOOGLE_KEY) return;
    let autocomplete;
    loadGoogleMaps()
      .then((google) => {
        if (!inputRef.current) return;
        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["geometry", "formatted_address"],
          componentRestrictions: { country: "gh" },
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const loc = place.geometry?.location;
          if (loc) {
            const c = [loc.lat(), loc.lng()];
            setCoords(c);
            setAddressText(place.formatted_address || "");
            fetchQuote(c);
          }
        });
      })
      .catch(() => setError("Could not load the address search."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit(c, rt, data) {
    const opt = (data?.options || options).find((o) => o.ride_type_id === rt);
    onChange?.({
      coordinates: c,
      ride_type_id: rt ?? null,
      fee: opt?.amount ?? data?.delivery_fee?.amount ?? null,
      eta: data?.duration_minutes ?? null,
      address: addressText,
    });
  }

  async function fetchQuote(c) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/delivery/quote/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropoff: c }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not get a delivery quote for this address.");
        setQuote(null);
        setOptions([]);
        return;
      }
      setQuote(data);
      const opts = data.options || [];
      setOptions(opts);
      const defRt =
        opts.find((o) => o.available)?.ride_type_id ?? opts[0]?.ride_type_id ?? null;
      setRideTypeId(defRt);
      emit(c, defRt, data);
    } catch {
      setError("Could not reach the delivery service.");
    } finally {
      setLoading(false);
    }
  }

  function selectRide(rt) {
    setRideTypeId(rt);
    emit(coords, rt, quote);
  }

  if (!GOOGLE_KEY) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Delivery quotes are currently unavailable.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
        <HiLocationMarker className="text-[#C8961F]" /> Delivery location
      </label>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search your delivery address…"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-3 focus-visible:outline-2 focus-visible:outline-[#C8961F]"
      />

      {loading && (
        <p className="text-sm text-gray-500" role="status">
          Getting delivery estimate…
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {quote && !loading && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <HiTruck className="text-[#C8961F]" />
            <span>
              Estimated delivery
              {quote.duration_minutes ? ` · ~${quote.duration_minutes} min` : ""}
              {quote.distance_km ? ` · ${quote.distance_km} km` : ""}
            </span>
          </div>
          {options.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {options.map((opt) => (
                <label
                  key={opt.ride_type_id}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 cursor-pointer ${
                    rideTypeId === opt.ride_type_id
                      ? "border-[#C8961F] bg-[#C8961F]/5"
                      : "border-gray-200 dark:border-gray-700"
                  } ${opt.available === false ? "opacity-50" : ""}`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="ride_type"
                      checked={rideTypeId === opt.ride_type_id}
                      disabled={opt.available === false}
                      onChange={() => selectRide(opt.ride_type_id)}
                      className="accent-[#C8961F]"
                    />
                    {opt.label}
                  </span>
                  <span className="text-sm font-semibold">₵{opt.amount}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
