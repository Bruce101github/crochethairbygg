"use client";

import { useEffect, useRef, useState } from "react";
import { HiTruck, HiLocationMarker } from "react-icons/hi";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google);
  if (window.__gmapsPromise) return window.__gmapsPromise;
  if (!GOOGLE_KEY) return Promise.reject(new Error("missing key"));

  // Google's official inline bootstrap loader (defines importLibrary).
  window.__gmapsPromise = new Promise((resolve, reject) => {
    ((g) => {
      let h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary",
        q = "__ib__", m = document, b = window;
      b = b[c] || (b[c] = {});
      const d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(),
        u = () => h || (h = new Promise(async (f, n) => {
          a = m.createElement("script");
          e.set("libraries", [...r] + "");
          for (k in g) e.set(k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()), g[k]);
          e.set("callback", c + ".maps." + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + " could not load.")));
          a.nonce = m.querySelector("script[nonce]")?.nonce || "";
          m.head.append(a);
        }));
      d[l]
        ? console.warn(p + " only loads once. Ignoring:", g)
        : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)));
    })({ key: GOOGLE_KEY, v: "weekly" });

    if (window.google?.maps?.importLibrary) resolve(window.google);
    else reject(new Error("importLibrary unavailable"));
  });

  // Allow a later retry if this attempt fails.
  window.__gmapsPromise.catch(() => {
    window.__gmapsPromise = null;
  });
  return window.__gmapsPromise;
}

/**
 * Drop-off address search with a self-rendered suggestion dropdown (Places
 * Autocomplete Data API — no full-screen takeover), then a Mckot delivery
 * quote with selectable ride types.
 * Calls onChange({ coordinates, ride_type_id, fee, eta, address }).
 */
export default function DeliveryQuote({ onChange }) {
  const placesRef = useRef(null);
  const tokenRef = useRef(null);
  const debounceRef = useRef(null);
  const boxRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [coords, setCoords] = useState(null);
  const [quote, setQuote] = useState(null);
  const [options, setOptions] = useState([]);
  const [rideTypeId, setRideTypeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!GOOGLE_KEY) return;
    loadGoogleMaps()
      .then(async (google) => {
        placesRef.current = await google.maps.importLibrary("places");
        setReady(true);
      })
      .catch((e) => {
        console.error("Google Maps failed to load:", e);
        setError("Could not load the address search.");
      });
  }, []);

  // Close the dropdown on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setSuggestions([]);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onInput(value) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 3 || !placesRef.current) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  }

  async function fetchSuggestions(value) {
    try {
      const places = placesRef.current;
      if (!tokenRef.current) tokenRef.current = new places.AutocompleteSessionToken();
      const { suggestions: list } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          sessionToken: tokenRef.current,
          includedRegionCodes: ["gh"],
        });
      setSuggestions(list || []);
    } catch {
      setSuggestions([]);
    }
  }

  async function selectSuggestion(s) {
    try {
      const pred = s.placePrediction;
      const place = pred.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress"] });
      const loc = place.location;
      const lat = typeof loc?.lat === "function" ? loc.lat() : loc?.lat;
      const lng = typeof loc?.lng === "function" ? loc.lng() : loc?.lng;
      const formatted = place.formattedAddress || pred.text?.text || "";
      setQuery(formatted);
      setSuggestions([]);
      tokenRef.current = null; // end the autocomplete session
      if (lat != null && lng != null) {
        const c = [lat, lng];
        setCoords(c);
        // surface the location immediately, even before the quote returns
        onChange?.({ coordinates: c, ride_type_id: null, fee: null, eta: null, address: formatted });
        fetchQuote(c, formatted);
      }
    } catch {
      setError("Could not read that address. Please try another.");
    }
  }

  function emit(c, rt, data, address) {
    const opt = (data?.options || options).find((o) => o.ride_type_id === rt);
    onChange?.({
      coordinates: c,
      ride_type_id: rt ?? null,
      fee: opt?.amount ?? data?.delivery_fee?.amount ?? null,
      eta: data?.duration_minutes ?? null,
      address: address ?? query,
    });
  }

  async function fetchQuote(c, address) {
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
      emit(c, defRt, data, address);
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
        <HiLocationMarker className="text-[#C8961F]" /> Delivery address
      </label>

      <div ref={boxRef} className="relative">
        <input
          type="text"
          value={query}
          disabled={!ready && !error}
          onChange={(e) => onInput(e.target.value)}
          placeholder={ready ? "Search your delivery address…" : "Loading address search…"}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-4 py-3 focus-visible:outline-2 focus-visible:outline-[#C8961F]"
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-64">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => selectSuggestion(s)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {s.placePrediction?.text?.text ||
                    s.placePrediction?.mainText?.text ||
                    "Address"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
