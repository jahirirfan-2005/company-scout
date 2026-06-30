from rest_framework import serializers
from .models import Company

class CompanySerializer(serializers.ModelSerializer):
    reviewsCount = serializers.IntegerField(source='reviews_count', required=False, allow_null=True)
    totalScore = serializers.FloatField(source='total_score', required=False, allow_null=True)

    class Meta:
        model = Company
        fields = [
            'id',
            'name',
            'category',
            'location',
            'address',
            'phone',
            'website',
            'url',
            'rating',
            'totalScore',
            'reviewsCount',
        ]
