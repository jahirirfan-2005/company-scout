from django.db import models

class Company(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=100, blank=True, null=True)
    website = models.CharField(max_length=1000, blank=True, null=True)  # Using CharField to avoid validation issues with non-standard URLs
    url = models.CharField(max_length=1000, unique=True)
    rating = models.FloatField(blank=True, null=True)
    total_score = models.FloatField(blank=True, null=True)
    reviews_count = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name

class SearchQuery(models.Model):
    location = models.CharField(max_length=255, blank=True)
    company_type = models.CharField(max_length=255, blank=True)
    companies = models.ManyToManyField(Company, related_name='search_queries')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Search: '{self.company_type}' in '{self.location}' ({self.created_at})"
