from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.conf import settings
from decimal import Decimal


# ============================
# CATEGORY
# ============================
class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, related_name='subcategories', null=True, blank=True)
    is_nav_link = models.BooleanField(default=False, help_text="Show as a navigation link in the main nav bar")
    nav_order = models.IntegerField(default=0, help_text="Order in navigation menu")

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['nav_order', 'name']
        # Ensure slug is unique per parent level
        constraints = [
            models.UniqueConstraint(fields=['slug', 'parent'], name='unique_slug_per_parent')
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
            # If slug already exists at this level, add parent slug prefix or number
            if Category.objects.filter(slug=self.slug, parent=self.parent).exclude(pk=self.pk).exists():
                base_slug = self.slug
                counter = 1
                while Category.objects.filter(slug=self.slug, parent=self.parent).exclude(pk=self.pk).exists():
                    self.slug = f"{base_slug}-{counter}"
                    counter += 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.parent.name} > {self.name}" if self.parent else self.name


# ============================
# PRODUCT
# ============================
class Product(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title


# ============================
# PRODUCT VARIANT
# ============================
class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")

    # Hair features
    length = models.CharField(max_length=20, blank=True, null=True)      # 12", 14", 28"
    color = models.CharField(max_length=50, blank=True, null=True)       # 1B, 613
    texture = models.CharField(max_length=50, blank=True, null=True)     # Straight, Body Wave
    bundle_deal = models.IntegerField(blank=True, null=True)             # 1, 3, 5 bundles
    wig_size = models.CharField(max_length=20, blank=True, null=True)    # 21", 22", 23"
    lace_type = models.CharField(max_length=50, blank=True, null=True)   # HD, Transparent
    density = models.CharField(max_length=20, blank=True, null=True)     # 150%, 180%

    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.product.title} - Variant #{self.id}"


# ============================
# PRODUCT IMAGES
# ============================
class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="products/`)
    is_main = models.BooleanField(default=False)

    def __str__(self):
        return f"Image for {self.product.title}"



    
# ============================
# CART
# ============================
class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart ({self.user.username})"

# ============================
# CART ITEM
# ============================
class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('cart', 'variant')

    def __str__(self):
        return f"{self.variant} x {self.quantity}"
    
# ============================
# ADDRESS
# ============================
class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    address_line = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    region = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="Ghana")
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} - {self.address_line}"

# ============================
# SHIPPING METHOD
# ============================
class ShippingMethod(models.Model):
    name = models.CharField(max_length=100)  # e.g. "Standard Delivery", "Express"
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.price}"
    


# ============================
# DISCOUNT CODE
# ============================
class DiscountCode(models.Model):
    code = models.CharField(max_length=50, unique=True, help_text="The discount code customers will enter")
    description = models.CharField(max_length=255, blank=True, help_text="Description of the discount")
    discount_type = models.CharField(
        max_length=10,
        choices=[('percentage', 'Percentage'), ('fixed', 'Fixed Amount')],
        default='percentage'
    )
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percentage (e.g., 10) or fixed amount (e.g., 50)")
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Minimum order total to use this code")
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Maximum discount amount (for percentage codes)")
    is_active = models.BooleanField(default=True)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    usage_limit = models.IntegerField(null=True, blank=True, help_text="Maximum number of times this code can be used (null = unlimited)")
    times_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self, cart_total=Decimal('0')):
        """Check if discount code is valid"""
        if not self.is_active:
            return False, "This discount code is no longer active"
        
        from django.utils import timezone
        now = timezone.now()
        
        if self.valid_from and now < self.valid_from:
            return False, "This discount code is not yet valid"
        
        if self.valid_until and now > self.valid_until:
            return False, "This discount code has expired"
        
        if self.min_purchase_amount > 0 and cart_total < self.min_purchase_amount:
            return False, f"Minimum purchase of ₵{self.min_purchase_amount} required"
        
        if self.usage_limit and self.times_used >= self.usage_limit:
            return False, "This discount code has reached its usage limit"
        
        return True, "Valid"
    
    def calculate_discount(self, cart_total):
        """Calculate discount amount based on cart total"""
        if self.discount_type == 'percentage':
            discount = (cart_total * self.discount_value) / 100
            if self.max_discount_amount:
                discount = min(discount, self.max_discount_amount)
        else:  # fixed
            discount = min(self.discount_value, cart_total)
        
        return discount
    
    def __str__(self):
        return f"{self.code} - {self.discount_type} ({self.discount_value})"


# ============================
# ORDER
# ============================
class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders", help_text="User account (null for guest orders)")
    guest_email = models.EmailField(null=True, blank=True, help_text="Email for guest orders")
    guest_name = models.CharField(max_length=255, null=True, blank=True, help_text="Full name for guest orders")
    is_guest = models.BooleanField(default=False, help_text="True if this is a guest order")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Order total before discount and shipping")
    discount_code = models.ForeignKey(DiscountCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_method = models.ForeignKey(ShippingMethod, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tracking_number = models.CharField(max_length=100, blank=True, null=True, help_text="Shipping tracking number")
    # Guest address fields (stored directly on order for guest checkout)
    guest_address_full_name = models.CharField(max_length=255, null=True, blank=True)
    guest_address_phone = models.CharField(max_length=20, null=True, blank=True)
    guest_address_line = models.CharField(max_length=255, null=True, blank=True)
    guest_address_city = models.CharField(max_length=100, null=True, blank=True)
    guest_address_region = models.CharField(max_length=100, null=True, blank=True)
    guest_address_country = models.CharField(max_length=100, default="Ghana", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.user:
            return f"Order #{self.id} - {self.user.username}"
        return f"Order #{self.id} - Guest ({self.guest_email or 'No email'})"


# ============================
# ORDER ITEM
# ============================
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField(default=1)
    item_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Item {self.variant} (x{self.quantity})"


# ============================
# RETURN REQUEST
# ============================
class ReturnRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("refunded", "Refunded"),
        ("cancelled", "Cancelled"),
    ]

    REASON_CHOICES = [
        ("defective", "Defective/Damaged Item"),
        ("wrong_item", "Wrong Item Received"),
        ("not_as_described", "Not as Described"),
        ("changed_mind", "Changed My Mind"),
        ("size_issue", "Size/Color Issue"),
        ("quality_issue", "Quality Issue"),
        ("other", "Other"),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='return_requests')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='return_requests', null=True, blank=True, help_text="Specific item to return. If null, entire order return.")
    reason = models.CharField(max_length=50, choices=REASON_CHOICES)
    reason_description = models.TextField(help_text="Additional details about the return")
    requested_refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Customer requested refund amount")
    approved_refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Admin approved refund amount")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_notes = models.TextField(blank=True, help_text="Admin notes (internal)")
    refund_reference = models.CharField(max_length=255, blank=True, null=True, help_text="Paystack refund reference")
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        item_info = f"Item #{self.order_item.id}" if self.order_item else "Full Order"
        return f"Return Request #{self.id} - Order #{self.order.id} - {item_info} - {self.status}"


# ============================
# FAVORITES / WISHLIST
# ============================
class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favorites")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.product.title}"


# ============================
# PRODUCT LIKES
# ============================
class ProductLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="product_likes")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')


# ============================
# HERO SLIDE
# ============================
class HeroSlide(models.Model):
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    cta1_text = models.CharField(max_length=100, default="Shop Now")
    cta1_link = models.CharField(max_length=255, default="/products")
    cta2_text = models.CharField(max_length=100, blank=True)
    cta2_link = models.CharField(max_length=255, blank=True)
    background_image = models.ImageField(upload_to='hero_slides/', blank=True, null=True)
    mobile_image = models.ImageField(upload_to='hero_slides/', blank=True, null=True, help_text="Optional: Different image for mobile screens")
    tablet_image = models.ImageField(upload_to='hero_slides/', blank=True, null=True, help_text="Optional: Different image for tablet screens")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)  # For ordering slides
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.title


# ============================
# PROMO BANNER
# ============================
class PromoBanner(models.Model):
    text = models.CharField(max_length=255)
    mobile_text = models.CharField(max_length=100, blank=True)  # Shorter text for mobile
    cta_text = models.CharField(max_length=50, default="Get Now")
    cta_link = models.CharField(max_length=255, default="/products")
    has_countdown = models.BooleanField(default=False)
    countdown_hours = models.IntegerField(default=0)
    countdown_minutes = models.IntegerField(default=0)
    countdown_seconds = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)  # For ordering banners
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.text


# ============================
# REVIEW
# ============================
class Review(models.Model):
    RATING_CHOICES = [
        (1, '1 Star'),
        (2, '2 Stars'),
        (3, '3 Stars'),
        (4, '4 Stars'),
        (5, '5 Stars'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    order_item = models.ForeignKey(OrderItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="review", help_text="The order item this review is for (to verify purchase)")
    rating = models.IntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'product', 'order_item')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.product.title} - {self.rating} stars"
