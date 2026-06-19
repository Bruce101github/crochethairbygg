"""
Server-side client for the Mckot Merchant Delivery API.

Docs / base: https://api.mckot.com/merchant/v1

The merchant API key is a SERVER-SIDE SECRET (settings.MCKOT_MERCHANT_API_KEY)
and must never reach the storefront. The Next.js client talks only to our own
Django endpoints, which proxy to Mckot through this module.

Response envelope:
    success -> {"success": true,  "data": {...}}
    error   -> {"success": false, "error": {"message", "code"}}
"""
import hmac
import hashlib
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MckotError(Exception):
    """Raised when Mckot returns an error envelope or the request fails."""

    def __init__(self, message, code=None, status_code=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class MckotConfigError(MckotError):
    """Raised when the integration is not configured (missing API key)."""


def _base_url():
    return getattr(
        settings, "MCKOT_BASE_URL", "https://api.mckot.com/merchant/v1"
    ).rstrip("/")


def _headers():
    key = getattr(settings, "MCKOT_MERCHANT_API_KEY", "") or ""
    if not key:
        raise MckotConfigError(
            "MCKOT_MERCHANT_API_KEY is not configured", code="not_configured"
        )
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _request(method, path, payload=None, timeout=30):
    url = f"{_base_url()}{path}"
    try:
        resp = requests.request(
            method, url, json=payload, headers=_headers(), timeout=timeout
        )
    except requests.RequestException as e:
        logger.error("Mckot request failed: %s %s -> %s", method, path, e)
        raise MckotError(
            f"Could not reach the delivery service: {e}", code="network_error"
        )

    try:
        body = resp.json()
    except ValueError:
        body = {}

    if resp.ok and isinstance(body, dict) and body.get("success"):
        return body.get("data", {}) or {}

    err = body.get("error") or {} if isinstance(body, dict) else {}
    message = err.get("message") or f"Mckot API error (HTTP {resp.status_code})"
    code = err.get("code")
    logger.warning(
        "Mckot API error: %s %s -> %s (%s)", method, path, message, code
    )
    raise MckotError(message, code=code, status_code=resp.status_code)


# --- Public API ------------------------------------------------------------

def get_merchant():
    """GET /me — merchant profile + wallet balance. Useful as a smoke test."""
    return _request("GET", "/me")


def quote(dropoff_coordinates, pickup_coordinates=None, ride_type_id=None):
    """
    POST /deliveries/quote

    coordinates are [lat, lng]. Returns data containing quote_id (valid 15 min),
    delivery_fee.amount (string GHS), duration_minutes, distance_km and options[]
    (the available ride types). pickup defaults to the store base if omitted.
    """
    payload = {"dropoff": {"coordinates": list(dropoff_coordinates)}}
    if pickup_coordinates:
        payload["pickup"] = {"coordinates": list(pickup_coordinates)}
    if ride_type_id is not None:
        payload["ride_type_id"] = ride_type_id
    return _request("POST", "/deliveries/quote", payload)


def create_delivery(quote_id, order_ref, customer, goods=None,
                    fee_payer="merchant_wallet"):
    """
    POST /deliveries — book a courier.

    order_ref is the idempotency key: replaying the same order_ref returns the
    existing delivery, so this is safe to retry.

    customer:  {"name": ..., "phone": ...}
    goods:     {"payment": "prepaid"} or {"payment": "cod", "amount": "180.00"}
    fee_payer: "merchant_wallet" or "add_to_collection"
    """
    payload = {
        "quote_id": quote_id,
        "order_ref": str(order_ref),
        "customer": customer,
        "goods": goods or {"payment": "prepaid"},
        "fee_payer": fee_payer,
    }
    return _request("POST", "/deliveries", payload)


def get_delivery(delivery_id_or_ref):
    """GET /deliveries/{id} — id may be the delivery id OR your order_ref."""
    return _request("GET", f"/deliveries/{delivery_id_or_ref}")


def cancel(delivery_id_or_ref, reason=None):
    """POST /deliveries/{id}/cancel — allowed while pending/assigned."""
    payload = {"reason": reason} if reason else None
    return _request("POST", f"/deliveries/{delivery_id_or_ref}/cancel", payload)


def verify_webhook_signature(raw_body, signature_header):
    """
    Verify the X-Mckot-Signature header ("sha256=<hex>").

    signature == HMAC-SHA256(raw_body, MCKOT_WEBHOOK_SECRET). Returns a bool,
    using a constant-time comparison. raw_body must be the raw request bytes.
    """
    secret = getattr(settings, "MCKOT_WEBHOOK_SECRET", "") or ""
    if not secret or not signature_header:
        return False
    provided = signature_header.split("=", 1)[-1].strip()
    if isinstance(raw_body, str):
        raw_body = raw_body.encode("utf-8")
    computed = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(provided, computed)
