"""
Email utility functions for sending notifications
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


def send_password_reset_email(user, reset_token):
    """
    Send password reset email to user
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}&email={user.email}"
    
    subject = "Reset Your Password - Crochet Hair by GG"
    
    # Plain text message
    message = f"""
    Hello {user.username},
    
    You requested to reset your password. Click the link below to reset it:
    
    {reset_url}
    
    This link will expire in 24 hours.
    
    If you didn't request this, please ignore this email.
    
    Best regards,
    Crochet Hair by GG Team
    """
    
    # HTML message
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #FF6B9D; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #FF6B9D; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Crochet Hair by GG</h1>
            </div>
            <div class="content">
                <h2>Password Reset Request</h2>
                <p>Hello {user.username},</p>
                <p>You requested to reset your password. Click the button below to reset it:</p>
                <a href="{reset_url}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_url}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>Best regards,<br>Crochet Hair by GG Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False


def send_order_confirmation_email(order):
    """
    Send order confirmation email to customer (supports both authenticated and guest orders)
    """
    # Get recipient email - use guest email if guest order, otherwise use user email
    recipient_email = order.guest_email if order.is_guest else (order.user.email if order.user else None)
    customer_name = order.guest_name if order.is_guest else (order.user.username if order.user else "Customer")
    
    if not recipient_email:
        print(f"Warning: No email found for order #{order.id}")
        return False
    
    subject = f"Order Confirmation - Order #{order.id}"
    
    # Build order items list
    items_html = ""
    items_text = ""
    for item in order.items.all():
        product_title = item.variant.product.title if item.variant and item.variant.product else "Product"
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">{product_title}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">{item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₵{item.item_total}</td>
        </tr>
        """
        items_text += f"{product_title} x{item.quantity} - ₵{item.item_total}\n"
    
    # HTML message
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #FF6B9D; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .order-info {{ background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
            th {{ background-color: #FF6B9D; color: white; padding: 10px; text-align: left; }}
            .total {{ font-size: 18px; font-weight: bold; color: #FF6B9D; text-align: right; margin-top: 15px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Confirmation</h1>
            </div>
            <div class="content">
                <h2>Thank you for your order, {customer_name}!</h2>
                <p>Your order has been received and is being processed.</p>
                
                <div class="order-info">
                    <h3>Order Details</h3>
                    <p><strong>Order Number:</strong> #{order.id}</p>
                    <p><strong>Order Date:</strong> {order.created_at.strftime('%B %d, %Y at %I:%M %p')}</p>
                    <p><strong>Status:</strong> {order.status.title()}</p>
                </div>
                
                <h3>Order Items</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th style="text-align: center;">Quantity</th>
                            <th style="text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <div class="total">
                    <p>Subtotal: ₵{order.subtotal}</p>
                    {f'<p style="color: #10b981;">Discount ({order.discount_code.code}): -₵{order.discount_amount}</p>' if order.discount_code and order.discount_amount > 0 else ''}
                    <p>Shipping: ₵{order.shipping_cost}</p>
                    <p>Total: ₵{order.total}</p>
                </div>
                
                {f'''
                <div class="order-info">
                    <h3>Shipping Address</h3>
                    <p>{order.address.full_name}<br>
                    {order.address.address_line}<br>
                    {order.address.city}, {order.address.region}<br>
                    {order.address.country}<br>
                    Phone: {order.address.phone_number}</p>
                </div>
                ''' if order.address else (f'''
                <div class="order-info">
                    <h3>Shipping Address</h3>
                    <p>{order.guest_address_full_name}<br>
                    {order.guest_address_line}<br>
                    {order.guest_address_city}, {order.guest_address_region}<br>
                    {order.guest_address_country or 'Ghana'}<br>
                    Phone: {order.guest_address_phone}</p>
                </div>
                ''' if order.is_guest else '')}
                
                <p>You can track your order status by {'visiting your account or ' if not order.is_guest else ''}using the order tracking page at {settings.FRONTEND_URL}/track-order</p>
            </div>
            <div class="footer">
                <p>Thank you for shopping with us!<br>Crochet Hair by GG Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text message
    message = f"""
    Thank you for your order, {customer_name}!
    
    Your order has been received and is being processed.
    
    Order Number: #{order.id}
    Order Date: {order.created_at.strftime('%B %d, %Y at %I:%M %p')}
    Status: {order.status.title()}
    
    Order Items:
    {items_text}
    
    Subtotal: ₵{order.subtotal}
    {f'Discount ({order.discount_code.code}): -₵{order.discount_amount}' if order.discount_code and order.discount_amount > 0 else ''}
    Shipping: ₵{order.shipping_cost}
    Total: ₵{order.total}
    
    {f'Tracking Number: {order.tracking_number}' if order.tracking_number else ''}
    
    {f'''
    Shipping Address:
    {order.address.full_name}
    {order.address.address_line}
    {order.address.city}, {order.address.region}
    {order.address.country}
    Phone: {order.address.phone_number}
    ''' if order.address else (f'''
    Shipping Address:
    {order.guest_address_full_name}
    {order.guest_address_line}
    {order.guest_address_city}, {order.guest_address_region}
    {order.guest_address_country or 'Ghana'}
    Phone: {order.guest_address_phone}
    ''' if order.is_guest else '')}
    
    You can track your order status by {'visiting your account or ' if not order.is_guest else ''}using the order tracking page at {settings.FRONTEND_URL}/track-order
    
    Thank you for shopping with us!
    Crochet Hair by GG Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending order confirmation email: {e}")
        return False


def send_order_status_update_email(order):
    """
    Send order status update email to customer (supports both authenticated and guest orders)
    """
    # Get recipient email and name
    recipient_email = order.guest_email if order.is_guest else (order.user.email if order.user else None)
    customer_name = order.guest_name if order.is_guest else (order.user.username if order.user else "Customer")
    
    if not recipient_email:
        print(f"Warning: No email found for order #{order.id}")
        return False
    
    status_messages = {
        "paid": "Your payment has been confirmed!",
        "processing": "Your order is being prepared for shipment.",
        "shipped": "Your order has been shipped!",
        "delivered": "Your order has been delivered!",
        "cancelled": "Your order has been cancelled.",
    }
    
    subject = f"Order #{order.id} Status Update - {order.status.title()}"
    status_message = status_messages.get(order.status, "Your order status has been updated.")
    
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #FF6B9D; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background-color: #f9f9f9; }}
            .status-box {{ background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #FF6B9D; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Status Update</h1>
            </div>
            <div class="content">
                <h2>Hello {customer_name},</h2>
                <p>{status_message}</p>
                
                <div class="status-box">
                    <p><strong>Order Number:</strong> #{order.id}</p>
                    <p><strong>New Status:</strong> {order.status.title()}</p>
                    <p><strong>Updated:</strong> {order.created_at.strftime('%B %d, %Y at %I:%M %p')}</p>
                </div>
                
                <p>You can track your order status by {'visiting your account or ' if not order.is_guest else ''}using the order tracking page at {settings.FRONTEND_URL}/track-order</p>
            </div>
            <div class="footer">
                <p>Thank you for shopping with us!<br>Crochet Hair by GG Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = f"""
    Hello {customer_name},
    
    {status_message}
    
    Order Number: #{order.id}
    New Status: {order.status.title()}
    
    You can track your order status by {'visiting your account or ' if not order.is_guest else ''}using the order tracking page at {settings.FRONTEND_URL}/track-order
    
    Thank you for shopping with us!
    Crochet Hair by GG Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Error sending order status update email: {e}")
        return False

