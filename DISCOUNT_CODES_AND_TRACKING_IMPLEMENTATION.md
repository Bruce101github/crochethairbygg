# Discount Codes and Order Tracking - Implementation Guide

## ✅ What's Been Implemented

### 1. Discount Codes System
- **Backend:**
  - `DiscountCode` model with support for percentage and fixed amount discounts
  - Validation endpoint: `POST /api/discount-code/validate/`
  - Discount codes are automatically applied during checkout
  - Features:
    - Percentage or fixed amount discounts
    - Minimum purchase amount requirement
    - Maximum discount cap (for percentage codes)
    - Usage limits and expiration dates
    - Active/inactive status

- **Frontend:**
  - Discount code input in cart page
  - Real-time validation and application
  - Visual feedback for valid/invalid codes
  - Discount displayed in order summary
  - Discount code passed to checkout

### 2. Order Tracking Numbers
- **Backend:**
  - `tracking_number` field added to Order model
  - Admin can update tracking number when updating order status
  - Tracking number included in order serializers

- **Frontend:**
  - Tracking number displayed on order detail page
  - Tracking number displayed on order tracking page
  - Tracking number included in order confirmation emails

## 📋 Database Changes Required

**Important:** You need to run migrations to apply these changes:

```bash
cd Backend
python manage.py makemigrations
python manage.py migrate
```

This will create:
- `DiscountCode` table
- Add `discount_code`, `discount_amount`, `subtotal`, and `tracking_number` fields to `Order` table

## 🎯 How to Use

### Creating Discount Codes (Admin)

1. Go to Django Admin (`/admin`)
2. Navigate to "Store" → "Discount codes"
3. Click "Add Discount Code"
4. Fill in the form:
   - **Code**: The code customers will enter (e.g., "SAVE10")
   - **Description**: Optional description
   - **Discount Type**: Percentage or Fixed Amount
   - **Discount Value**: The percentage (e.g., 10) or amount (e.g., 50)
   - **Minimum Purchase**: Minimum order total required (optional)
   - **Max Discount Amount**: Maximum discount for percentage codes (optional)
   - **Usage Limit**: Maximum number of times code can be used (optional)
   - **Valid From/Until**: Date range for code validity (optional)
   - **Is Active**: Toggle to enable/disable the code

### Example Discount Codes:

**10% off orders over ₵100:**
- Code: `SAVE10`
- Discount Type: Percentage
- Discount Value: 10
- Min Purchase: 100
- Max Discount: 50 (caps discount at ₵50)

**₵50 off any order:**
- Code: `FLAT50`
- Discount Type: Fixed Amount
- Discount Value: 50

**20% off (unlimited):**
- Code: `WELCOME20`
- Discount Type: Percentage
- Discount Value: 20
- Usage Limit: (leave blank for unlimited)

### Using Discount Codes (Customer)

1. Add items to cart
2. On cart page, enter discount code in the input field
3. Click "Apply" or press Enter
4. If valid, discount is applied and shown in order summary
5. Proceed to checkout (discount is automatically included)
6. Discount is applied when order is created

### Setting Tracking Numbers (Admin)

1. Go to Django Admin → Orders
2. Click on an order to edit
3. Update the order status (optional)
4. Enter tracking number in the "Tracking number" field
5. Save
6. Customer will receive email notification with tracking number

## 🔧 API Endpoints

### Validate Discount Code
```
POST /api/discount-code/validate/
Body: {
  "code": "SAVE10",
  "cart_total": 150.00
}

Response (Success): {
  "code": "SAVE10",
  "discount_type": "percentage",
  "discount_value": "10",
  "discount_amount": "15.00",
  "description": "10% off orders over ₵100"
}

Response (Error): {
  "error": "Invalid discount code" or "Minimum purchase of ₵100 required"
}
```

### Checkout (Updated)
```
POST /api/checkout/
Body: {
  "address_id": 1,
  "shipping_method_id": 1,
  "discount_code": "SAVE10"  // Optional
}
```

### Update Order Status (Updated)
```
PATCH /api/orders/{id}/status/
Body: {
  "status": "shipped",
  "tracking_number": "TRACK123456789"  // Optional
}
```

## 📧 Email Updates

Order confirmation and status update emails now include:
- Discount information (if applied)
- Tracking number (if available)
- Updated order totals with discount breakdown

## 🎨 Frontend Features

### Cart Page
- Discount code input field
- Real-time validation
- Visual success/error feedback
- Discount display in order summary
- Remove discount option

### Order Detail Page
- Tracking number display (if available)
- Discount code and amount display
- Updated totals with discount breakdown

### Order Tracking Page
- Tracking number prominently displayed
- Order status timeline

## 🔒 Validation Rules

Discount codes are validated for:
- Active status
- Validity dates (if set)
- Minimum purchase amount (if set)
- Usage limits (if set)
- Code exists and is valid

## 📝 Notes

- Discount codes are case-insensitive (SAVE10 = save10 = Save10)
- Discount cannot make order total negative (minimum is ₵0)
- Discount code usage is incremented when order is created
- Tracking numbers can be added/updated by admin at any time
- Email notifications include discount and tracking information

## 🐛 Troubleshooting

### Discount Code Not Applying:
1. Check code is active in admin
2. Verify validity dates are correct
3. Ensure minimum purchase amount is met
4. Check usage limit hasn't been exceeded
5. Verify code spelling (case-insensitive)

### Tracking Number Not Showing:
1. Verify tracking_number field exists in Order model
2. Check order detail API response includes tracking_number
3. Ensure admin has entered tracking number
4. Check frontend is using updated serializer

### Migration Issues:
1. Make sure all previous migrations are applied
2. Run `python manage.py makemigrations store`
3. Review migration file before applying
4. Run `python manage.py migrate`
