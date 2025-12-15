from django.core.management.base import BaseCommand
from store.models import Category


class Command(BaseCommand):
    help = 'Create initial categories and subcategories for the store'

    def handle(self, *args, **options):
        # Main Categories (Parent categories)
        hair_extensions, created = Category.objects.get_or_create(
            slug='hair-extensions',
            defaults={
                'name': 'Hair Extensions',
                'is_nav_link': True,
                'nav_order': 1
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created category: {hair_extensions.name}'))
        
        wigs, created = Category.objects.get_or_create(
            slug='wigs',
            defaults={
                'name': 'Wigs',
                'is_nav_link': True,
                'nav_order': 2
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created category: {wigs.name}'))
        
        closures, created = Category.objects.get_or_create(
            slug='closures',
            defaults={
                'name': 'Closures',
                'is_nav_link': True,
                'nav_order': 3
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created category: {closures.name}'))
        
        accessories, created = Category.objects.get_or_create(
            slug='accessories',
            defaults={
                'name': 'Accessories',
                'is_nav_link': True,
                'nav_order': 4
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created category: {accessories.name}'))

        # Subcategories for Hair Extensions
        extensions_subcats = [
            ('deep-wave', 'Deep Wave', hair_extensions),
            ('body-wave', 'Body Wave', hair_extensions),
            ('loose-wave', 'Loose Wave', hair_extensions),
            ('straight', 'Straight', hair_extensions),
            ('curly', 'Curly', hair_extensions),
            ('bundles', 'Hair Bundles', hair_extensions),
        ]
        
        for slug, name, parent in extensions_subcats:
            cat, created = Category.objects.get_or_create(
                slug=slug,
                parent=parent,
                defaults={'name': name}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created subcategory: {parent.name} > {name}'))

        # Subcategories for Wigs
        wigs_subcats = [
            ('lace-front-wigs', 'Lace Front Wigs', wigs),
            ('full-lace-wigs', 'Full Lace Wigs', wigs),
            ('glueless-wigs', 'Glueless Wigs', wigs),
            ('human-hair-wigs', 'Human Hair Wigs', wigs),
            ('frontal-wigs', 'Frontal Wigs', wigs),
        ]
        
        for slug, name, parent in wigs_subcats:
            cat, created = Category.objects.get_or_create(
                slug=slug,
                parent=parent,
                defaults={'name': name}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created subcategory: {parent.name} > {name}'))

        # Subcategories for Closures
        closures_subcats = [
            ('lace-closures', 'Lace Closures', closures),
            ('silk-closures', 'Silk Closures', closures),
            ('transparent-closures', 'Transparent Closures', closures),
        ]
        
        for slug, name, parent in closures_subcats:
            cat, created = Category.objects.get_or_create(
                slug=slug,
                parent=parent,
                defaults={'name': name}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created subcategory: {parent.name} > {name}'))

        # Subcategories for Accessories
        accessories_subcats = [
            ('wig-caps', 'Wig Caps', accessories),
            ('hair-tools', 'Hair Tools', accessories),
            ('hair-care', 'Hair Care Products', accessories),
            ('jewelry', 'Jewelry', accessories),
        ]
        
        for slug, name, parent in accessories_subcats:
            cat, created = Category.objects.get_or_create(
                slug=slug,
                parent=parent,
                defaults={'name': name}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created subcategory: {parent.name} > {name}'))

        self.stdout.write(self.style.SUCCESS('\nCategories and subcategories created successfully!'))

