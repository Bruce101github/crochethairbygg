from rest_framework import serializers
from .models import Category, Product, ProductVariant, ProductImage, Order, OrderItem, Cart, CartItem, Address, ShippingMethod, Favorite, ProductLike, HeroSlide, PromoBanner, Review, DiscountCode, ReturnRequest


class CategorySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    subcategories = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'image', 'image_url', 'parent', 'is_nav_link', 'nav_order', 'subcategories']
        read_only_fields = ['image_url', 'subcategories', 'slug']  # Slug is auto-generated
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_subcategories(self, obj):
        subcats = obj.subcategories.all().order_by('nav_order', 'name')
        return CategorySerializer(subcats, many=True, context=self.context).data


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'product', 'image', 'is_main']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'product',
            'length', 'color', 'texture', 'bundle_deal', 'wig_size', 'lace_type', 'density',
            'price', 'stock'
        ]


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    order_item_id = serializers.PrimaryKeyRelatedField(
        queryset=OrderItem.objects.all(), source='order_item', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Review
        fields = ['id', 'user', 'user_id', 'product', 'order_item', 'order_item_id', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ('user', 'order_item', 'created_at', 'updated_at')


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    reviews = ReviewSerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'title', 'description', 'category', 'base_price', 'is_active', 'variants', 'images', 'like_count', 'is_liked', 'reviews', 'average_rating', 'review_count', 'can_review']

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ProductLike.objects.filter(user=request.user, product=obj).exists()
        return False

    def get_average_rating(self, obj):
        reviews = obj.reviews.all()
        if reviews.exists():
            return round(sum(review.rating for review in reviews) / reviews.count(), 1)
        return 0.0

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_can_review(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # Check if user has purchased this product
        user_orders = Order.objects.filter(user=request.user, status__in=['paid', 'processing', 'shipped', 'delivered'])
        for order in user_orders:
            for item in order.items.all():
                if item.variant and item.variant.product == obj:
                    # Check if user hasn't already reviewed this product
                    if not Review.objects.filter(user=request.user, product=obj).exists():
                        return True
        return False


class OrderItemSerializer(serializers.ModelSerializer):
    variant = ProductVariantSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'variant', 'quantity', 'item_total']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    discount_code = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'total', 'subtotal', 'discount_code', 'discount_amount', 'status', 'tracking_number', 'created_at', 'items']




class CartItemSerializer(serializers.ModelSerializer):
    variant = ProductVariantSerializer(read_only=True)
    variant_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(), source='variant', write_only=True
    )

    class Meta:
        model = CartItem
        fields = ['id', 'variant', 'variant_id', 'quantity']


class CartSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    items = CartItemSerializer(many=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'user', 'items', 'total_price']

    def get_total_price(self, obj):
        total = 0
        for item in obj.items.all():
            total += item.variant.price * item.quantity
        return total

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        user = validated_data.get('user')

        # Prevent duplicate cart error — get or create cart
        cart, created = Cart.objects.get_or_create(user=user)

        # Clear existing items if cart already existed
        if not created:
            cart.items.all().delete()

        # Add items fresh
        for item_data in items_data:
            CartItem.objects.create(cart=cart, **item_data)

        return cart

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items')
        instance.save()

        # Process each item - items_data comes from nested serializer validation
        # variant_id should already be transformed to variant object via source='variant'
        keep_items = []
        processed_variants = set()  # Track variants we've processed
        
        for item_data in items_data:
            item_id = item_data.get('id', None)
            quantity = item_data.get('quantity', 1)
            variant = item_data.get('variant')  # Should be ProductVariant object after nested validation
            
            if not variant:
                continue  # Skip if variant is missing
            
            # Track that we've processed this variant
            variant_id = variant.id if hasattr(variant, 'id') else variant
            processed_variants.add(variant_id)
            
            if item_id:
                # Try to update existing item by ID
                try:
                    item = CartItem.objects.get(id=item_id, cart=instance)
                    # Update quantity to the value provided (frontend sends total quantity)
                    item.quantity = quantity
                    item.save()
                    keep_items.append(item.id)
                except CartItem.DoesNotExist:
                    # Item ID doesn't exist, check if variant already exists
                    try:
                        existing_item = CartItem.objects.get(cart=instance, variant=variant)
                        # Update quantity to the value provided (frontend sends total quantity)
                        existing_item.quantity = quantity
                        existing_item.save()
                        keep_items.append(existing_item.id)
                    except CartItem.DoesNotExist:
                        # Create new item
                        item = CartItem.objects.create(cart=instance, variant=variant, quantity=quantity)
                        keep_items.append(item.id)
            else:
                # New item without ID - check if variant already exists in cart
                try:
                    existing_item = CartItem.objects.get(cart=instance, variant=variant)
                    # Variant already exists - frontend sends total quantity, so use it directly
                    existing_item.quantity = quantity
                    existing_item.save()
                    keep_items.append(existing_item.id)
                except CartItem.DoesNotExist:
                    # Variant doesn't exist, create new item
                    item = CartItem.objects.create(cart=instance, variant=variant, quantity=quantity)
                keep_items.append(item.id)

        # Remove items not included in the update (items that weren't in the request)
        for item in instance.items.all():
            if item.id not in keep_items:
                item.delete()

        return instance


class OrderItemDetailSerializer(serializers.ModelSerializer):
    variant = ProductVariantSerializer(read_only=True)
    product = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'variant', 'quantity', 'item_total', 'product', 'has_review', 'review', 'can_review']

    def get_product(self, obj):
        if obj.variant and obj.variant.product:
            product = obj.variant.product
            images = product.images.all()[:1]
            request = self.context.get('request')
            image_urls = []
            for img in images:
                if img.image:
                    if request:
                        image_urls.append({'image': request.build_absolute_uri(img.image.url)})
                    else:
                        image_urls.append({'image': img.image.url if hasattr(img.image, 'url') else str(img.image)})
            return {
                'id': product.id,
                'title': product.title,
                'images': image_urls
            }
        return None

    def get_has_review(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and obj.variant and obj.variant.product:
            return Review.objects.filter(
                user=request.user,
                product=obj.variant.product,
                order_item=obj
            ).exists()
        return False

    def get_review(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and obj.variant and obj.variant.product:
            review = Review.objects.filter(
                user=request.user,
                product=obj.variant.product,
                order_item=obj
            ).first()
            if review:
                return ReviewSerializer(review, context=self.context).data
        return None

    def get_can_review(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        if not obj.variant or not obj.variant.product:
            return False
        # Check if order status allows reviewing (paid, processing, shipped, delivered)
        if obj.order.status not in ['paid', 'processing', 'shipped', 'delivered']:
            return False
        # Check if user hasn't already reviewed
        return not Review.objects.filter(
            user=request.user,
            product=obj.variant.product,
            order_item=obj
        ).exists()


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemDetailSerializer(many=True, read_only=True)
    discount_code = serializers.StringRelatedField(read_only=True)
    address = serializers.SerializerMethodField()
    shipping_method = serializers.SerializerMethodField()
    
    def get_address(self, obj):
        if obj.address:
            return AddressSerializer(obj.address).data
        elif obj.is_guest:
            # Return guest address from order fields
            return {
                'full_name': obj.guest_address_full_name,
                'phone_number': obj.guest_address_phone,
                'address_line': obj.guest_address_line,
                'city': obj.guest_address_city,
                'region': obj.guest_address_region,
                'country': obj.guest_address_country or 'Ghana',
            }
        return None
    
    def get_shipping_method(self, obj):
        if obj.shipping_method:
            return ShippingMethodSerializer(obj.shipping_method).data
        return None

    class Meta:
        model = Order
        fields = [
            'id',
            'status',
            'total',
            'subtotal',
            'discount_code',
            'discount_amount',
            'shipping_cost',
            'tracking_number',
            'created_at',
            'items',
            'address',
            'shipping_method'
        ]


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status', 'tracking_number']


class DiscountCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'description', 'discount_type', 'discount_value', 
            'min_purchase_amount', 'max_discount_amount', 'is_active', 
            'usage_limit', 'times_used', 'valid_from', 'valid_until', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['times_used', 'created_at', 'updated_at']


class ReturnRequestSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_item_details = serializers.SerializerMethodField()
    order_details = serializers.SerializerMethodField()

    class Meta:
        model = ReturnRequest
        fields = [
            'id', 'order', 'order_id', 'order_item', 'order_item_details', 'order_details',
            'reason', 'reason_description', 'requested_refund_amount', 
            'approved_refund_amount', 'status', 'admin_notes', 'refund_reference',
            'requested_at', 'processed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['refund_reference', 'processed_at', 'created_at', 'updated_at', 'requested_at']

    def get_order_item_details(self, obj):
        if not obj.order_item:
            return None
            
        try:
            # Safely access nested relationships - use getattr to avoid triggering queries
            product_title = None
            try:
                variant = getattr(obj.order_item, 'variant', None)
                if variant:
                    product = getattr(variant, 'product', None)
                    if product:
                        product_title = getattr(product, 'title', None)
            except (AttributeError, Exception) as e:
                # Variant or product doesn't exist, product_title stays None
                pass
            
            return {
                'id': getattr(obj.order_item, 'id', None),
                'product_title': product_title,
                'quantity': getattr(obj.order_item, 'quantity', 0),
                'item_total': float(getattr(obj.order_item, 'item_total', 0)),
            }
        except Exception as e:
            # Fallback if there's any error - return minimal data
            return {
                'id': getattr(obj.order_item, 'id', None) if obj.order_item else None,
                'product_title': None,
                'quantity': 0,
                'item_total': 0.0,
            }

    def get_order_details(self, obj):
        try:
            return {
                'id': obj.order.id if obj.order else None,
                'total': float(obj.order.total) if obj.order and hasattr(obj.order, 'total') else 0.0,
                'status': obj.order.status if obj.order and hasattr(obj.order, 'status') else None,
                'created_at': obj.order.created_at.isoformat() if obj.order and hasattr(obj.order, 'created_at') else None,
            }
        except Exception as e:
            import traceback
            print(f"Error in get_order_details for ReturnRequest {obj.id}: {e}")
            traceback.print_exc()
            return {
                'id': None,
                'total': 0.0,
                'status': None,
                'created_at': None,
            }


class ReturnRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequest
        fields = ['order', 'order_item', 'reason', 'reason_description', 'requested_refund_amount']

    def validate_order(self, value):
        # Ensure user owns the order
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context is required.")
        
        if request.user != value.user:
            raise serializers.ValidationError("You can only create return requests for your own orders.")
        
        # Check if order is eligible for return (paid/delivered)
        if value.status not in ['paid', 'processing', 'shipped', 'delivered']:
            raise serializers.ValidationError(f"Only paid or delivered orders can be returned. Current status: {value.status}")
        
        return value

    def validate(self, data):
        order = data.get('order')
        order_item = data.get('order_item')
        
        # Get order ID (could be instance or ID)
        order_id = order.id if hasattr(order, 'id') else order
        
        # If order_item is specified, ensure it belongs to the order
        if order_item:
            # DRF converts ForeignKey IDs to instances, so order_item should be an OrderItem instance
            if hasattr(order_item, 'order'):
                # It's an instance, check the order
                item_order_id = order_item.order.id if hasattr(order_item.order, 'id') else order_item.order
                if item_order_id != order_id:
                    raise serializers.ValidationError("Order item must belong to the specified order.")
                item_id = order_item.id
            else:
                # It's still an ID (shouldn't happen, but handle it)
                from .models import OrderItem
                try:
                    item_obj = OrderItem.objects.get(id=order_item)
                    if item_obj.order.id != order_id:
                        raise serializers.ValidationError("Order item must belong to the specified order.")
                    item_id = item_obj.id
                except OrderItem.DoesNotExist:
                    raise serializers.ValidationError("Order item does not exist.")
        else:
            # If no order_item specified, set to None explicitly for full order return
            data['order_item'] = None
            item_id = None
        
        # Check for existing pending return request for this item/order
        if item_id:
            existing = ReturnRequest.objects.filter(
                order_id=order_id,
                order_item_id=item_id,
                status='pending'
            )
        else:
            existing = ReturnRequest.objects.filter(
                order_id=order_id,
                order_item__isnull=True,
                status='pending'
            )
        if existing.exists():
            item_text = "this item" if order_item else "this order"
            raise serializers.ValidationError(f"A pending return request already exists for {item_text}.")
        
        return data


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id',
            'user',
            'full_name',
            'phone_number',
            'city',
            'region',
            'address_line',
            'is_default',
        ]
        read_only_fields = ('user',)


class ShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ['id', 'name', 'price', 'is_active']


class FavoriteSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    class Meta:
        model = Favorite
        fields = ['id', 'product', 'product_id', 'created_at']
        read_only_fields = ('user', 'created_at')


class HeroSlideSerializer(serializers.ModelSerializer):
    background_image_url = serializers.SerializerMethodField()

    class Meta:
        model = HeroSlide
        fields = [
            'id', 'title', 'subtitle', 'description',
            'cta1_text', 'cta1_link', 'cta2_text', 'cta2_link',
            'background_image', 'background_image_url', 'is_active', 'order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')

    def get_background_image_url(self, obj):
        if obj.background_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.background_image.url)
            return obj.background_image.url
        return None


class PromoBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoBanner
        fields = [
            'id', 'text', 'mobile_text', 'cta_text', 'cta_link',
            'has_countdown', 'countdown_hours', 'countdown_minutes', 'countdown_seconds',
            'is_active', 'order', 'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')