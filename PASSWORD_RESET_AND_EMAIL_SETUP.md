# Password Reset and Email Notifications - Implementation Guide

## ✅ What's Been Implemented

### 1. Password Reset Functionality
- **Backend API Endpoints:**
  - `POST /api/password/reset/request/` - Request password reset (sends email)
  - `POST /api/password/reset/confirm/` - Confirm password reset with token

- **Frontend Pages:**
  - `/forgot-password` - Request password reset
  - `/reset-password` - Reset password with token from email

- **Features:**
  - Secure token-based password reset (24-hour expiration)
  - Email verification before reset
  - Password validation (minimum 8 characters)
  - Beautiful HTML email templates
  - User-friendly error handling

### 2. Email Notifications
- **Order Confirmation Email:**
  - Sent automatically when an order is created
  - Includes order details, items, totals, and shipping address
  - Beautiful HTML template with order summary

- **Order Status Update Email:**
  - Sent automatically when order status changes (paid, processing, shipped, delivered, cancelled)
  - Includes new status and order information
  - Triggered by:
    - Payment confirmation (via Paystack webhook)
    - Admin status updates

## 📧 Email Configuration

### Development Setup (Console Backend)
By default, if no email credentials are provided, Django will use the console email backend. Emails will be printed to the console/terminal where you run `python manage.py runserver`.

### Production Setup (SMTP)
To send real emails, configure these environment variables in your `.env` file:

```env
# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@crochethairbygg.com
```

### Gmail Setup Instructions
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Create a new app password for "Mail"
   - Use this password in `EMAIL_HOST_PASSWORD`

### Other Email Providers
- **SendGrid:** Use `smtp.sendgrid.net` with port 587
- **Mailgun:** Use `smtp.mailgun.org` with port 587
- **AWS SES:** Use your AWS SES SMTP endpoint

## 🔧 Backend Files Modified/Created

### New Files:
- `Backend/store/email_utils.py` - Email sending utilities
  - `send_password_reset_email()` - Password reset emails
  - `send_order_confirmation_email()` - Order confirmation emails
  - `send_order_status_update_email()` - Status update emails

### Modified Files:
- `Backend/backend/settings.py` - Added email configuration
- `Backend/store/views.py` - Added password reset views and email triggers
- `Backend/store/urls.py` - Added password reset endpoints

## 🎨 Frontend Files Created

### New Pages:
- `client/src/app/forgot-password/page.js` - Forgot password request page
- `client/src/app/reset-password/page.js` - Password reset confirmation page

### Modified Files:
- `client/src/app/signin/page.js` - Updated "Forgot Password" link

## 🚀 How to Use

### Password Reset Flow:
1. User clicks "Forgot your password?" on sign-in page
2. User enters email address
3. System sends password reset email with secure token
4. User clicks link in email (valid for 24 hours)
5. User enters new password
6. Password is reset and user is redirected to sign-in

### Email Notifications:
- **Automatic:** Emails are sent automatically when:
  - An order is created (confirmation email)
  - Payment is confirmed (status update email)
  - Admin updates order status (status update email)

## 🧪 Testing

### Test Password Reset:
1. Go to `/signin`
2. Click "Forgot your password?"
3. Enter a registered email
4. Check console/email for reset link
5. Click link and reset password

### Test Email Notifications:
1. Create an order (goes through checkout)
2. Check console/email for order confirmation
3. Complete payment
4. Check console/email for status update

### Development Testing:
In development mode (no email credentials), all emails will be printed to the Django console. Check your terminal where `python manage.py runserver` is running.

## 🔒 Security Features

- **Token Expiration:** Password reset tokens expire after 24 hours
- **One-time Use:** Tokens are validated and cannot be reused
- **Email Verification:** Reset links require both token and email verification
- **Password Validation:** Minimum 8 characters required
- **Secure Token Generation:** Uses Django's `default_token_generator`

## 📝 Notes

- Email sending failures won't break the application (errors are logged but don't fail requests)
- In production, make sure to configure proper email settings
- Email templates are HTML-based with fallback plain text
- All emails include your brand styling (pink theme)

## 🐛 Troubleshooting

### Emails Not Sending:
1. Check email configuration in `.env` file
2. Verify SMTP credentials are correct
3. Check Django console for error messages
4. For Gmail, ensure App Password is used (not regular password)

### Password Reset Not Working:
1. Verify token hasn't expired (24 hours)
2. Check that email matches the user account
3. Ensure token format is correct (uid:token)
4. Check Django console for errors

### Order Emails Not Sending:
1. Verify user has a valid email address
2. Check Django console for email errors
3. Ensure email backend is properly configured

