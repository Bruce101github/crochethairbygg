from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0017_alter_category_image_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Delivery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mckot_delivery_id', models.CharField(blank=True, help_text='Mckot delivery id', max_length=100, null=True)),
                ('quote_id', models.CharField(blank=True, help_text='Locked Mckot quote (valid 15 min)', max_length=100, null=True)),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('pending', 'Pending'), ('assigned', 'Assigned'), ('in_transit', 'In Transit'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('collection_status', models.CharField(blank=True, help_text='not_required | pending | remitted', max_length=20, null=True)),
                ('ride_type_id', models.IntegerField(blank=True, null=True)),
                ('ride_type_label', models.CharField(blank=True, max_length=100, null=True)),
                ('delivery_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('distance_km', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('duration_minutes', models.IntegerField(blank=True, null=True)),
                ('courier_name', models.CharField(blank=True, max_length=255, null=True)),
                ('courier_phone', models.CharField(blank=True, max_length=50, null=True)),
                ('tracking_url', models.URLField(blank=True, null=True)),
                ('dropoff_lat', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('dropoff_lng', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('raw_response', models.JSONField(blank=True, help_text='Last Mckot payload, for debugging', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='delivery', to='store.order')),
            ],
            options={
                'verbose_name_plural': 'Deliveries',
                'ordering': ['-created_at'],
            },
        ),
    ]
