from django.shortcuts import render
from .models import Category, Product, Order, Cart, OrderItem, Address, ShippingMethod, Favorite, ProductLike, HeroSlide, PromoBanner, ProductVariant, ProductImage, Review, DiscountCode, ReturnRequest
from .serializers import CategorySerializer, ProductSerializer, OrderSerializer, CartSerializer, OrderDetailSerializer, AddressSerializer, ShippingMethodSerializer, OrderStatusUpdateSerializer, FavoriteSerializer, HeroSlideSerializer, PromoBannerSerializer, ProductVariantSerializer, ProductImageSerializer, ReviewSerializer, DiscountCodeSerializer, ReturnRequestSerializer, ReturnRequestCreateSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework import generics, filters, viewsets, permissions, parsers
from django.contrib.auth.models import User
from rest_framework.serializers import ModelSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
import requests
from django.conf import settings
import json
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from decimal import Decimal
from .email_utils import send_password_reset_email, send_order_confirmation_email, send_order_status_update_email
import hmac
import hashlib
import uuid  # add at top if not present


class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        return user

class RegisterUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        queryset = Category.objects.all().prefetch_related('subcategories')
        
        # Filter by is_nav_link if requested
        is_nav_link = self.request.query_params.get('is_nav_link', None)
        if is_nav_link is not None:
            queryset = queryset.filter(is_nav_link=is_nav_link.lower() == 'true')

        # Only filter by parent__isnull if not explicitly requesting children
        queryset = queryset.filter(parent__isnull=True)

        return queryset.order_by('nav_order', 'name')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['title', 'description']
    ordering_fields = ['base_price', 'title', 'id']
    ordering = ['-id']  # Order by ID descending (most recent first)
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
            # Admins can see all products including inactive ones
            return Product.objects.all()
        return Product.objects.filter(is_active=True)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            # Admins can see all orders, regular users see only their own
            if user.is_staff:
                return Order.objects.all().order_by('-created_at')
            return Order.objects.filter(user=user).order_by('-created_at')
        return Order.objects.none()


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)



class CheckoutView(APIView):
    permission_classes = []  # Allow both authenticated and anonymous users

    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        is_guest = not user

        # 1. Read address + shipping + discount code from frontend
        address_id = request.data.get("address_id")
        shipping_method_id = request.data.get("shipping_method_id")
        discount_code_str = request.data.get("discount_code")
        
        # Guest checkout fields
        guest_email = request.data.get("guest_email")
        guest_name = request.data.get("guest_name")
        guest_address = request.data.get("guest_address")  # Dictionary with address fields

        if is_guest:
            # Guest checkout validation
            if not guest_email or not guest_name:
                return Response({"error": "Email and name are required for guest checkout"}, status=400)
            if not guest_address:
                return Response({"error": "Shipping address is required"}, status=400)
            if not shipping_method_id:
                return Response({"error": "Shipping method is required"}, status=400)
        else:
            # Authenticated checkout validation
            if not address_id or not shipping_method_id:
                return Response({"error": "address_id and shipping_method_id are required"}, status=400)
            
            # 2. Validate address for authenticated users
            try:
                address = Address.objects.get(id=address_id, user=user)
            except Address.DoesNotExist:
                return Response({"error": "Invalid address"}, status=400)

        # 3. Validate shipping method
        try:
            shipping_method = ShippingMethod.objects.get(id=shipping_method_id, is_active=True)
        except ShippingMethod.DoesNotExist:
            return Response({"error": "Invalid shipping method"}, status=400)

        shipping_cost = shipping_method.price

        # 4. Load cart or cart items
        cart_items_data = request.data.get("cart_items")  # For guest checkout
        cart = None
        cart_items = []
        
        if is_guest:
            # Guest checkout: cart items come from request
            if not cart_items_data or not isinstance(cart_items_data, list) or len(cart_items_data) == 0:
                return Response({"error": "Cart items are required for guest checkout"}, status=400)
            cart_items = cart_items_data
        else:
            # Authenticated checkout: load from user's cart
            try:
                cart = Cart.objects.get(user=user)
            except Cart.DoesNotExist:
                return Response({"error": "Cart is empty."}, status=400)
            
            if cart.items.count() == 0:
                return Response({"error": "Cart has no items."}, status=400)

        # 5. Calculate subtotal (before discount and shipping)
        subtotal = Decimal('0')
        items_to_process = []
        
        if is_guest:
            # Process guest cart items
            for item_data in cart_items:
                variant_id = item_data.get("variant_id")
                quantity = int(item_data.get("quantity", 1))
                
                try:
                    variant = ProductVariant.objects.get(id=variant_id)
                except ProductVariant.DoesNotExist:
                    return Response({"error": f"Invalid product variant ID: {variant_id}"}, status=400)
                
                # Stock validation
                if quantity > variant.stock:
                    return Response({
                        "error": f"Not enough stock for {variant}. Available: {variant.stock}"
                    }, status=400)
                
                item_total = variant.price * quantity
                subtotal += item_total
                items_to_process.append({"variant": variant, "quantity": quantity, "item_total": item_total})
        else:
            # Process authenticated cart items
            for item in cart.items.all():
                variant = item.variant
                
                # Stock validation
                if item.quantity > variant.stock:
                    return Response({
                        "error": f"Not enough stock for {variant}. Available: {variant.stock}"
                    }, status=400)
                
                item_total = variant.price * item.quantity
                subtotal += item_total
                items_to_process.append({"variant": variant, "quantity": item.quantity, "item_total": item_total})

        # 6. Validate and apply discount code if provided
        discount_code = None
        discount_amount = Decimal('0')
        
        if discount_code_str:
            try:
                discount_code_obj = DiscountCode.objects.get(code__iexact=discount_code_str)
                is_valid, message = discount_code_obj.is_valid(subtotal)
                
                if is_valid:
                    discount_code = discount_code_obj
                    discount_amount = discount_code_obj.calculate_discount(subtotal)
                    # Increment usage count
                    discount_code.times_used += 1
                    discount_code.save()
                else:
                    return Response({"error": f"Discount code error: {message}"}, status=400)
            except DiscountCode.DoesNotExist:
                return Response({"error": "Invalid discount code"}, status=400)

        # 7. Calculate total (subtotal - discount + shipping)
        total = subtotal - discount_amount + shipping_cost
        if total < 0:
            total = Decimal('0')

        # 8. Create order WITH shipping + address + discount
        order_data = {
            "user": user,
            "is_guest": is_guest,
            "subtotal": subtotal,
            "discount_code": discount_code,
            "discount_amount": discount_amount,
            "total": total,
            "shipping_method": shipping_method,
            "shipping_cost": shipping_cost,
        }
        
        if is_guest:
            # Guest order: store address directly and guest info
            order_data.update({
                "guest_email": guest_email,
                "guest_name": guest_name,
                "guest_address_full_name": guest_address.get("full_name"),
                "guest_address_phone": guest_address.get("phone_number"),
                "guest_address_line": guest_address.get("address_line"),
                "guest_address_city": guest_address.get("city"),
                "guest_address_region": guest_address.get("region"),
                "guest_address_country": guest_address.get("country", "Ghana"),
            })
        else:
            # Authenticated order: use address FK
            order_data["address"] = address
        
        order = Order.objects.create(**order_data)

        # 9. Create order items and update stock
        for item_data in items_to_process:
            variant = item_data["variant"]
            quantity = item_data["quantity"]
            item_total = item_data["item_total"]
            
            OrderItem.objects.create(
                order=order,
                variant=variant,
                quantity=quantity,
                item_total=item_total
            )

            # Update stock
            variant.stock -= quantity
            variant.save()

        # 10. Clear cart (only for authenticated users)
        if not is_guest and cart:
            cart.items.all().delete()

        # 11. Send order confirmation email
        try:
            print(f"Sending order confirmation email for order id {order.id}, user: {order.user}")
            send_order_confirmation_email(order)
        except Exception as e:
            print(f"Error sending order confirmation email: {e}")
            # Don't fail the request if email fails

        return Response({
            "message": "Order created successfully",
            "order_id": order.id,
            "subtotal": str(subtotal),
            "discount_amount": str(discount_amount),
            "total": str(total),
            "shipping_cost": str(shipping_cost),
        }, status=201)


class PaystackInitializeView(APIView):
    permission_classes = []  # Allow both authenticated and guest orders

    def post(self, request, order_id):
        user = request.user if request.user.is_authenticated else None

        # Get order (check if user owns it, or if it's a guest order)
        try:
            if user:
                order = Order.objects.get(id=order_id, user=user)
            else:
                # For guest orders, verify using email
                guest_email = request.data.get("guest_email")
                if not guest_email:
                    return Response({"error": "Email is required for guest orders"}, status=400)
                order = Order.objects.get(id=order_id, is_guest=True, guest_email=guest_email)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=404)

        # Check if order is already paid
        if order.status == "paid":
            return Response({
                "error": "This order has already been paid.",
                "order_status": order.status
            }, status=400)

        if order.total <= 0:
            return Response({"error": "Invalid order amount."}, status=400)

        # Get payment channel from request (card or mobile_money)
        payment_channel = request.data.get("payment_channel", "card")

        # Prepare Paystack payload
        customer_email = user.email if user else order.guest_email
        unique_ref = f"order_{order.id}_{uuid.uuid4().hex[:8]}"
        payload = {
            "email": customer_email,
            "amount": int(order.total * 100),
            "reference": unique_ref,
            "callback_url": f"{settings.FRONTEND_URL}/payment-success?reference={unique_ref}",
            "channels": [payment_channel]
        }

        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }

        url = f"{settings.PAYSTACK_BASE_URL}/initialize"

        # Call Paystack
        try:
            print(f"Initializing Paystack payment for order id {order.id}, user: {user}, guest_email: {order.guest_email if not user else 'N/A'}")
            print(f"Paystack payload: {payload}")
            response = requests.post(url, json=payload, headers=headers)
            print(f"Paystack response status code: {response.status_code}")
            print(f"Paystack response text: {response.text}")

            if response.status_code != 200:
                error_detail = response.text
                print(f"Paystack API error: {response.status_code} - {error_detail}")
                return Response({"error": f"Failed to initiate Paystack payment: {error_detail}"}, status=500)

            data = response.json()

            if "data" not in data or "authorization_url" not in data["data"]:
                print(f"Unexpected Paystack response: {data}")
                return Response({"error": "Invalid response from Paystack"}, status=500)

            return Response({
                "authorization_url": data["data"]["authorization_url"],
                "access_code": data["data"]["access_code"],
                "reference": data["data"]["reference"],
                "public_key": settings.PAYSTACK_PUBLIC_KEY,
                "amount": int(order.total * 100),
                "email": customer_email
            })
        except Exception as e:
            print(f"Error initializing Paystack payment: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({"error": f"Error initializing payment: {str(e)}"}, status=500)
    

class PaystackWebhookView(APIView):
    authentication_classes = []  # Paystack doesn't send auth tokens
    permission_classes = []      # Open endpoint (secured via signature)

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        if settings.DEBUG:
            # In debug mode, we'll still try to verify but won't fail if signature is missing
            paystack_signature = request.headers.get("x-paystack-signature")
            if paystack_signature:
                computed_signature = self._generate_signature(request.body)
                if paystack_signature != computed_signature:
                    return Response({"error": "Invalid signature"}, status=400)
        else:
            # For production, always verify the signature
            paystack_signature = request.headers.get("x-paystack-signature")
            if not paystack_signature:
                return Response({"error": "No signature provided"}, status=400)
            computed_signature = self._generate_signature(request.body)
            if paystack_signature != computed_signature:
                return Response({"error": "Invalid signature"}, status=400)

        event = request.data.get("event")

        if event == "charge.success":
            reference = request.data.get("data", {}).get("reference")
            if reference:
                self.handle_payment_success(reference)

        return Response({"status": "success"})

    def _generate_signature(self, payload):
        secret = settings.PAYSTACK_SECRET_KEY.encode('utf-8')
        return hmac.new(secret, payload, hashlib.sha512).hexdigest()

    def handle_payment_success(self, reference):
        # Example reference format: "order_12"
        if not reference.startswith("order_"):
            return

        order_id = int(reference.split("_")[1])

        # Verify transaction with Paystack
        verify_url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}

        response = requests.get(verify_url, headers=headers)
        data = response.json()

        if data["status"] is False or data["data"]["status"] != "success":
            return

        try:
            order = Order.objects.get(id=order_id)
            order.status = "paid"
            order.save()
            
            # Send order status update email
            try:
                send_order_status_update_email(order)
            except Exception as e:
                print(f"Error sending order status update email: {e}")
        except Order.DoesNotExist:
            pass


class OrderHistoryView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = []  # Allow both authenticated and guest access

    def get_queryset(self):
        user = self.request.user if self.request.user.is_authenticated else None
        if user:
            return Order.objects.filter(user=user)
        # For guest access, check via email in request
        return Order.objects.none()  # Will be handled by get_object

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class GuestOrderTrackView(APIView):
    """
    Allow guests to track their order using order ID and email
    """
    permission_classes = []
    
    def post(self, request):
        order_id = request.data.get("order_id")
        email = request.data.get("email")
        
        if not order_id or not email:
            return Response({"error": "Order ID and email are required"}, status=400)
        
        try:
            order = Order.objects.get(id=order_id, is_guest=True, guest_email__iexact=email)
            serializer = OrderDetailSerializer(order, context={'request': request})
            return Response(serializer.data, status=200)
        except Order.DoesNotExist:
            return Response({"error": "Order not found. Please check your order ID and email."}, status=404)


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ShippingMethodViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ShippingMethodSerializer
    permission_classes = [permissions.AllowAny]
    queryset = ShippingMethod.objects.filter(is_active=True)


class OrderStatusUpdateView(generics.UpdateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderStatusUpdateSerializer
    permission_classes = [permissions.IsAdminUser]

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        old_status = order.status
        old_tracking = order.tracking_number
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            order.refresh_from_db()
            if order.status != old_status or order.tracking_number != old_tracking:
                try:
                    send_order_status_update_email(order)
                except Exception as e:
                    print(f"Error sending order status update email: {e}")
        return response


class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return all favorites for the user, including those with inactive products
        return Favorite.objects.filter(user=self.request.user).select_related('product').order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        # Check if favorite already exists
        product_id = request.data.get('product_id')
        if product_id:
            existing = Favorite.objects.filter(user=request.user, product_id=product_id).first()
            if existing:
                return Response({"error": "Product is already in favorites"}, status=400)
        return super().create(request, *args, **kwargs)


class UserInfoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
        })


class ProductLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=404)

        like, created = ProductLike.objects.get_or_create(
            user=request.user,
            product=product
        )

        if not created:
            like.delete()
            return Response({"liked": False, "message": "Product unliked"})

        return Response({"liked": True, "message": "Product liked"})


class HeroSlideViewSet(viewsets.ModelViewSet):
    serializer_class = HeroSlideSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
            # Admins can see all slides including inactive ones
            return HeroSlide.objects.all().order_by('order', 'created_at')
        return HeroSlide.objects.filter(is_active=True).order_by('order', 'created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]


class PromoBannerViewSet(viewsets.ModelViewSet):
    serializer_class = PromoBannerSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return PromoBanner.objects.all().order_by('-created_at')
        return PromoBanner.objects.filter(is_active=True).order_by('-created_at')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]
    
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error creating HeroSlide: {e}")
            import traceback
            traceback.print_exc()
            return Response({"error": "An error occurred while creating the hero slide."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UsersStatsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        staff_users = User.objects.filter(is_staff=True).count()
        recent_users = User.objects.order_by('-date_joined')[:10]
        
        return Response({
            'total_users': total_users,
            'staff_users': staff_users,
            'recent_users': [
                {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'date_joined': user.date_joined.isoformat(),
                    'is_staff': user.is_staff
                }
                for user in recent_users
            ]
        })


class ProductVariantViewSet(viewsets.ModelViewSet):
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return ProductVariant.objects.all()


class ProductImageViewSet(viewsets.ModelViewSet):
    serializer_class = ProductImageSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        return ProductImage.objects.all()


class DiscountCodeViewSet(viewsets.ModelViewSet):
    queryset = DiscountCode.objects.all()
    serializer_class = DiscountCodeSerializer
    permission_classes = [permissions.IsAdminUser]  # Only admins can manage discount codes


class ReturnRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for return requests
    Customers can create return requests, admins can manage them
    """
    serializer_class = ReturnRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Base queryset with select_related for direct relations
        # Note: Can't use select_related on nullable foreign keys, so exclude order_item
        queryset = ReturnRequest.objects.select_related(
            'order', 
            'order__user'
        )
        
        if user.is_staff:
            # Admins can see all return requests
            return queryset
        else:
            # Customers can only see their own return requests
            return queryset.filter(order__user=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReturnRequestCreateSerializer
        return ReturnRequestSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request:
            context['request'] = self.request
        return context

    def perform_create(self, serializer):
        serializer.save()


class ProcessRefundView(APIView):
    """
    Process refund for approved return request
    Admin only
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, return_request_id):
        from django.utils import timezone
        
        try:
            return_request = ReturnRequest.objects.get(id=return_request_id)
        except ReturnRequest.DoesNotExist:
            return Response({"error": "Return request not found"}, status=status.HTTP_404_NOT_FOUND)

        if return_request.status != 'approved':
            return Response({
                "error": f"Cannot process refund. Return request status is '{return_request.status}'. It must be 'approved'."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not return_request.approved_refund_amount:
            return Response({
                "error": "Approved refund amount is required. Please set it before processing refund."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the original order payment reference
        order = return_request.order
        payment_reference = f"order_{order.id}"

        # Process refund through Paystack
        refund_amount = int(return_request.approved_refund_amount * 100)  # Convert to pesewas
        
        payload = {
            "transaction": payment_reference,
            "amount": refund_amount,  # Amount to refund in pesewas
            "currency": "GHS",
            "customer_note": f"Refund for return request #{return_request.id}",
            "merchant_note": f"Return request #{return_request.id} - Order #{order.id}"
        }

        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }

        url = f"{settings.PAYSTACK_BASE_URL}/refund"

        try:
            response = requests.post(url, json=payload, headers=headers)
            response_data = response.json()

            if response.status_code == 200 and response_data.get('status'):
                # Refund successful
                return_request.status = 'refunded'
                return_request.refund_reference = response_data.get('data', {}).get('transaction', {}).get('reference', '')
                return_request.processed_at = timezone.now()
                return_request.save()

                # Restore stock if returning order item
                if return_request.order_item and return_request.order_item.variant:
                    variant = return_request.order_item.variant
                    variant.stock += return_request.order_item.quantity
                    variant.save()

                return Response({
                    "message": "Refund processed successfully",
                    "refund_reference": return_request.refund_reference,
                    "refund_amount": str(return_request.approved_refund_amount),
                }, status=status.HTTP_200_OK)
            else:
                error_message = response_data.get('message', 'Failed to process refund')
                return Response({
                    "error": f"Paystack refund failed: {error_message}",
                    "details": response_data
                }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                "error": f"Error processing refund: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        product_id = self.request.query_params.get('product', None)
        if product_id:
            return Review.objects.filter(product_id=product_id).order_by('-created_at')
        return Review.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        product = serializer.validated_data['product']
        order_item = serializer.validated_data.get('order_item', None)

        # Verify that user has purchased this product
        user_orders = Order.objects.filter(
            user=user,
            status__in=['paid', 'processing', 'shipped', 'delivered']
        )

        has_purchased = False
        if order_item:
            # If order_item is provided, verify it belongs to the user and contains this product
            if order_item.order.user == user and order_item.variant and order_item.variant.product == product:
                has_purchased = True
        else:
            # Check if user has any order items with this product
            for order in user_orders:
                for item in order.items.all():
                    if item.variant and item.variant.product == product:
                        has_purchased = True
                        # Use the first matching order_item if not provided
                        if not order_item:
                            serializer.validated_data['order_item'] = item
                        break
                if has_purchased:
                    break

        if not has_purchased:
            raise ValidationError("You can only review products you have purchased.")

        # Check if user has already reviewed this product
        existing_review = Review.objects.filter(user=user, product=product)
        if existing_review.exists():
            raise ValidationError("You have already reviewed this product.")

        serializer.save(user=user)


# ============================
# DISCOUNT CODE VIEWS
# ============================

class ValidateDiscountCodeView(APIView):
    permission_classes = [permissions.AllowAny]  # Anyone can validate discount codes
    
    def post(self, request):
        code = request.data.get('code')
        cart_total = Decimal(str(request.data.get('cart_total', 0)))
        
        if not code:
            return Response({"error": "Discount code is required"}, status=400)
        
        try:
            discount_code = DiscountCode.objects.get(code__iexact=code)
            is_valid, message = discount_code.is_valid(cart_total)
            
            if is_valid:
                discount_amount = discount_code.calculate_discount(cart_total)
                return Response({
                    "valid": True,
                    "code": discount_code.code,
                    "discount_type": discount_code.discount_type,
                    "discount_value": float(discount_code.discount_value),
                    "discount_amount": float(discount_amount),
                    "message": "Discount code applied successfully"
                }, status=200)
            else:
                return Response({
                    "valid": False,
                    "error": message
                }, status=400)
        except DiscountCode.DoesNotExist:
            return Response({
                "valid": False,
                "error": "Invalid discount code"
            }, status=400)


class SalesAnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDate, TruncMonth
        from datetime import timedelta
        
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        # Total revenue (all time)
        total_revenue = Order.objects.filter(
            status__in=['paid', 'processing', 'shipped', 'delivered']
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Revenue for selected period
        period_revenue = Order.objects.filter(
            status__in=['paid', 'processing', 'shipped', 'delivered'],
            created_at__gte=start_date
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Previous period for comparison
        previous_start = start_date - timedelta(days=days)
        previous_period_revenue = Order.objects.filter(
            status__in=['paid', 'processing', 'shipped', 'delivered'],
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Calculate revenue change percentage
        revenue_change = 0
        if previous_period_revenue > 0:
            revenue_change = ((period_revenue - previous_period_revenue) / previous_period_revenue) * 100
        
        # Orders count for period
        period_orders = Order.objects.filter(created_at__gte=start_date).count()
        
        # Revenue by day (for chart)
        daily_revenue = Order.objects.filter(
            status__in=['paid', 'processing', 'shipped', 'delivered'],
            created_at__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('total')
        ).order_by('date')
        
        # Revenue by month (last 12 months)
        monthly_revenue = Order.objects.filter(
            status__in=['paid', 'processing', 'shipped', 'delivered']
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            revenue=Sum('total')
        ).order_by('month')[:12]
        
        # Top products by quantity sold
        from django.db.models import F
        top_products = OrderItem.objects.filter(
            order__status__in=['paid', 'processing', 'shipped', 'delivered'],
            order__created_at__gte=start_date
        ).values(
            'variant__product__id',
            'variant__product__title'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('item_total'))
        ).order_by('-total_quantity')[:10]
        
        # Recent orders
        recent_orders = Order.objects.select_related('user').order_by('-created_at')[:10]
        recent_orders_data = [
            {
                'id': order.id,
                'user': order.user.username if order.user else f"Guest ({order.guest_email})",
                'total': float(order.total),
                'status': order.status,
                'created_at': order.created_at.isoformat(),
            }
            for order in recent_orders
        ]
        
        # Average order value
        avg_order_value = Decimal('0')
        if period_orders > 0:
            avg_order_value = period_revenue / period_orders
        
        # Discount statistics
        discount_stats = Order.objects.filter(
            discount_code__isnull=False,
            created_at__gte=start_date
        ).aggregate(
            total_discount=Sum('discount_amount'),
            count=Count('id')
        )
        
        # Format daily revenue for chart
        daily_revenue_list = [
            {
                'date': item['date'].strftime('%Y-%m-%d') if item['date'] else None,
                'revenue': float(item['revenue'] or 0)
            }
            for item in daily_revenue
        ]
        
        # Format monthly revenue for chart
        monthly_revenue_list = [
            {
                'month': item['month'].strftime('%Y-%m') if item['month'] else None,
                'revenue': float(item['revenue'] or 0)
            }
            for item in monthly_revenue
        ]
        
        # Format top products
        top_products_list = [
            {
                'product_id': item['variant__product__id'],
                'product_name': item['variant__product__title'] or 'Unknown Product',
                'quantity_sold': item['total_quantity'] or 0,
                'revenue': float(item['total_revenue'] or 0)
            }
            for item in top_products
        ]
        
        # Format orders by status
        orders_by_status = Order.objects.filter(created_at__gte=start_date).values('status').annotate(count=Count('id'))
        orders_by_status_list = [
            {
                'status': item['status'],
                'count': item['count']
            }
            for item in orders_by_status
        ]
        
        return Response({
            'summary': {
                'total_revenue': float(total_revenue),
                'period_revenue': float(period_revenue),
                'previous_period_revenue': float(previous_period_revenue),
                'revenue_change_percent': float(revenue_change),
                'period_orders': period_orders,
                'avg_order_value': float(avg_order_value),
                'discount_total': float(discount_stats['total_discount'] or 0),
                'discount_orders_count': discount_stats['count'] or 0,
            },
            'charts': {
                'daily_revenue': daily_revenue_list,
                'monthly_revenue': monthly_revenue_list,
            },
            'top_products': top_products_list,
            'orders_by_status': orders_by_status_list,
            'recent_orders': recent_orders_data,
            'period_days': days,
        })


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=400)
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response({"message": "If an account exists with this email, a password reset link has been sent."}, status=200)
        
        # Generate token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Send email
        try:
            send_password_reset_email(user, f"{uid}:{token}")
            return Response({"message": "If an account exists with this email, a password reset link has been sent."}, status=200)
        except Exception as e:
            print(f"Error sending password reset email: {e}")
            return Response({"error": "Failed to send password reset email"}, status=500)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        
        if not token or not new_password:
            return Response({"error": "Token and new_password are required"}, status=400)
        
        try:
            uid, reset_token = token.split(':')
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (ValueError, User.DoesNotExist, TypeError):
            return Response({"error": "Invalid token"}, status=400)
        
        # Verify token
        if not default_token_generator.check_token(user, reset_token):
            return Response({"error": "Invalid or expired token"}, status=400)
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Password reset successfully"}, status=200)
