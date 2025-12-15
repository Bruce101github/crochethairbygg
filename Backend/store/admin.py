from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product, ProductVariant, ProductImage, Order, OrderItem, Cart, CartItem, Address, ShippingMethod, Favorite, ProductLike, HeroSlide, PromoBanner, Review, DiscountCode, ReturnRequest


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'image_preview', 'is_nav_link', 'nav_order']
    list_filter = ['parent', 'is_nav_link']
    prepopulated_fields = {'slug': ('name',)}
    # Explicitly list all fields including image
    fields = ('name', 'slug', 'parent', 'image', 'is_nav_link', 'nav_order')
    search_fields = ['name']
    readonly_fields = []
    
    def image_preview(self, obj):
        if obj and obj.image:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" />',
                obj.image.url
            )
        return format_html('<span style="color: #999;">No image</span>')
    image_preview.short_description = 'Image Preview'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'base_price', 'is_active']
    list_filter = ['is_active', 'category']
    search_fields = ['title', 'description']


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['product', 'price', 'stock', 'length', 'color', 'texture']
    list_filter = ['product', 'color', 'texture']
    search_fields = ['product__title']


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'is_main']
    list_filter = ['is_main']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__username', 'id']
    readonly_fields = ['created_at']


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'variant', 'quantity', 'item_total']
    list_filter = ['order']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at']


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['cart', 'variant', 'quantity']


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['user', 'full_name', 'city', 'region', 'is_default']
    list_filter = ['city', 'region', 'is_default']
    search_fields = ['user__username', 'full_name']


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'is_active']
    list_filter = ['is_active']


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'product__title']


@admin.register(ProductLike)
class ProductLikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'product__title']


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'subtitle', 'description']
    list_editable = ['is_active', 'order']


@admin.register(PromoBanner)
class PromoBannerAdmin(admin.ModelAdmin):
    list_display = ['text', 'is_active', 'has_countdown', 'order', 'created_at']
    list_filter = ['is_active', 'has_countdown', 'created_at']
    search_fields = ['text', 'mobile_text']
    list_editable = ['is_active', 'order']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['user__username', 'product__title', 'comment']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DiscountCode)
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_type', 'discount_value', 'is_active', 'times_used', 'usage_limit', 'valid_from', 'valid_until', 'created_at']
    list_filter = ['is_active', 'discount_type', 'created_at']
    search_fields = ['code', 'description']
    readonly_fields = ['times_used', 'created_at', 'updated_at']
    fieldsets = (
        ('Code Information', {
            'fields': ('code', 'description', 'is_active')
        }),
        ('Discount Details', {
            'fields': ('discount_type', 'discount_value', 'max_discount_amount', 'min_purchase_amount')
        }),
        ('Usage Limits', {
            'fields': ('usage_limit', 'times_used', 'valid_from', 'valid_until')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'order_item', 'reason', 'status', 'requested_refund_amount', 'approved_refund_amount', 'requested_at', 'processed_at']
    list_filter = ['status', 'reason', 'requested_at']
    search_fields = ['order__id', 'order__user__username', 'reason_description']
    readonly_fields = ['created_at', 'updated_at', 'requested_at']
    fieldsets = (
        ('Return Information', {
            'fields': ('order', 'order_item', 'reason', 'reason_description', 'status')
        }),
        ('Refund Details', {
            'fields': ('requested_refund_amount', 'approved_refund_amount', 'refund_reference')
        }),
        ('Admin', {
            'fields': ('admin_notes', 'processed_at')
        }),
        ('Timestamps', {
            'fields': ('requested_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )