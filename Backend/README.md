# Crochet Hair by GG — Backend (Django REST)

Store API for the Crochet Hair by GG storefront. Auth is JWT; payments via
Paystack; media on Cloudinary; delivery via Mckot.

## Mckot delivery integration

Couriers are dispatched through the [Mckot Merchant Delivery API]
(`https://api.mckot.com/merchant/v1`). The integration is **server-side only** —
the merchant API key never reaches the browser. The storefront calls our own
Django endpoints, which proxy to Mckot via `store/mckot.py`.

### Configure the key

Set these environment variables (e.g. in `Backend/.env`, and in Railway for
production). **Never commit the key.**

```
MCKOT_MERCHANT_API_KEY=mk_test_xxxxxxxxxxxxxxxxxxxx   # from Mckot; test key for integration
MCKOT_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx        # shared secret for webhook signatures
# Optional store pickup base [lat, lng]; Mckot also holds the registered base
MCKOT_PICKUP_LAT=5.6037
MCKOT_PICKUP_LNG=-0.1870
# merchant_wallet (fee billed to your Mckot wallet) | add_to_collection (rider collects fee)
MCKOT_DEFAULT_FEE_PAYER=merchant_wallet
```

The store must have a **registered pickup base** on Mckot's side (all pricing is
distance-from-base) or quotes/bookings fail.

Smoke-test the key (returns merchant profile + wallet balance):

```bash
curl -s https://api.mckot.com/merchant/v1/me -H "Authorization: Bearer $MCKOT_MERCHANT_API_KEY"
```

### Endpoints (all proxy to Mckot server-side)

| Method & path | Purpose |
|---|---|
| `POST /api/delivery/quote` | Fee + ETA + ride options for a drop-off. Body: `{ "dropoff": [lat, lng], "ride_type_id"?: n }` |
| `POST /api/orders/<id>/delivery` | Record the customer's chosen drop-off + ride type (checkout step). Same body; guests pass `guest_email`. |
| `GET /api/orders/<id>/delivery` | Current delivery + tracking; refreshes status from Mckot. Guests pass `?guest_email=`. |
| `POST /api/orders/<id>/delivery/book` | Staff manual book/retry. |
| `POST /api/mckot/webhook/` | Mckot status events (signature-verified). |

### Flow

1. **Quote** at checkout once the drop-off `[lat, lng]` is known → show
   `delivery_fee.amount` + ETA. The customer can pick a ride type from `options[]`.
2. **Select**: `POST /api/orders/<id>/delivery` saves the drop-off + ride type
   against the order (no courier booked yet).
3. **Book** (automatic): on Paystack `charge.success` the backend re-quotes for a
   fresh `quote_id` (the checkout quote expires after 15 min) and creates the
   delivery with `order_ref=order.id` (idempotent). No-op if no drop-off was
   chosen or Mckot isn't configured, so the payment flow is untouched.
4. **Track**: the order page polls `GET /api/orders/<id>/delivery` for
   `status`, `courier`, and `tracking_url`.

### Register the webhook

Give Mckot ops your webhook URL and the shared secret:

```
https://<your-backend-host>/api/mckot/webhook/
```

Mckot signs each event with `X-Mckot-Signature: sha256=<hex>` =
`HMAC-SHA256(raw_body, MCKOT_WEBHOOK_SECRET)`. The handler verifies this
(constant-time) and returns `2xx` to ack; invalid signatures are rejected `400`.
Events: `delivery.created/assigned/picked_up/completed/cancelled`.

### Notes / known gaps

- Quotes require drop-off **coordinates**, but checkout currently collects a text
  address. The storefront checkout needs to capture `[lat, lng]` (map picker or
  device geolocation) and pass it to the quote/select endpoints.
- `goods.payment` defaults to `prepaid` (orders are paid online via Paystack). To
  support cash-on-delivery, pass `{"payment": "cod", "amount": "..."}` when booking.
