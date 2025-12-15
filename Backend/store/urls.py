from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, OrderViewSet, RegisterUserView, CartViewSet, CheckoutView, PaystackInitializeView, PaystackWebhookView, OrderHistoryView, OrderDetailView, GuestOrderTrackView, AddressViewSet, ShippingMethodViewSet, OrderStatusUpdateView, FavoriteViewSet, UserInfoView, ProductLikeView, HeroSlideViewSet, PromoBannerViewSet, UsersStatsView, ProductVariantViewSet, ProductImageViewSet, ReviewViewSet, PasswordResetRequestView, PasswordResetConfirmView, ValidateDiscountCodeView, DiscountCodeViewSet, SalesAnalyticsView, ReturnRequestViewSet, ProcessRefundView


router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'product-variants', ProductVariantViewSet, basename='productvariant')
router.register(r'product-images', ProductImageViewSet, basename='productimage')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'shipping-methods', ShippingMethodViewSet, basename='shippingmethod')
router.register(r'favorites', FavoriteViewSet, basename='favorite')
router.register(r'hero-slides', HeroSlideViewSet, basename='heroslide')
router.register(r'promo-banners', PromoBannerViewSet, basename='promobanner')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'discount-codes', DiscountCodeViewSet, basename='discountcode')
router.register(r'return-requests', ReturnRequestViewSet, basename='returnrequest')

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='register'),
    path('user/', UserInfoView.as_view(), name='user-info'),
    path('users/stats/', UsersStatsView.as_view(), name='users-stats'),
    path('analytics/sales/', SalesAnalyticsView.as_view(), name='sales-analytics'),
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path("paystack/initiate/<int:order_id>/", PaystackInitializeView.as_view()),
    path("paystack/webhook/", PaystackWebhookView.as_view()),
    path('products/<int:product_id>/like/', ProductLikeView.as_view(), name='product-like'),
    # Password reset endpoints
    path('password/reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    # Discount code endpoint
    path('discount-code/validate/', ValidateDiscountCodeView.as_view(), name='validate-discount-code'),
    # Place explicit order-related endpoints before the router so 'history' is not
    # captured by the router's detail route (which would treat 'history' as a pk).
    path('orders/history/', OrderHistoryView.as_view(), name='order-history'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/track/', GuestOrderTrackView.as_view(), name='guest-order-track'),
    path('orders/<int:pk>/status/', OrderStatusUpdateView.as_view(), name='order-status-update'), 
    path('return-requests/<int:return_request_id>/process-refund/', ProcessRefundView.as_view(), name='process-refund'), 
    path('', include(router.urls)),
]
