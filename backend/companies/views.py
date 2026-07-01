import os
import requests
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListAPIView
from .models import Company, SearchQuery
from .serializers import CompanySerializer

class CompanySearchView(APIView):
    def post(self, request):
        location = (request.data.get('location') or '').strip()
        company_type = (request.data.get('companyType') or '').strip()
        max_results = request.data.get('maxResults', 20)
        
        # Validate input
        if not location and not company_type:
            return Response(
                {"error": "Provide a location, a company type, or both."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Constrain max results between 1 and 50
        try:
            max_results = min(max_digits := max(int(max_results), 1), 50)
        except ValueError:
            max_results = 20

        # Check for cached SearchQuery in last 24 hours
        time_threshold = timezone.now() - timedelta(hours=24)
        cached_query = SearchQuery.objects.filter(
            location__iexact=location,
            company_type__iexact=company_type,
            created_at__gte=time_threshold
        ).first()

        if cached_query:
            # Return cached results
            companies = cached_query.companies.all()
            serializer = CompanySerializer(companies, many=True)
            return Response(serializer.data)

        # Cache miss - call Apify API
        token = getattr(settings, 'APIFY_API_TOKEN', '')
        print("DEBUG: APIFY_API_TOKEN =", repr(token))
        
        if not token:
            return Response(
                {"error": "APIFY_API_TOKEN is not configured on the server. Real Google Maps data cannot be retrieved without an API token."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        search_term = (
            f"{company_type} in {location}" if company_type and location
            else f"{company_type}" if company_type
            else f"companies in {location}"
        )

        body = {
            "searchStringsArray": [search_term],
            "locationQuery": location,
            "maxCrawledPlacesPerSearch": max_results,
            "language": "en",
            "maxReviews": 0,
            "skipClosedPlaces": False,
            "scrapeContacts": False,
            "scrapeDirectories": False,
            "scrapeImageAuthors": False,
            "scrapeOrderOnline": False,
            "scrapePlaceDetailPage": False,
            "scrapeReviewsPersonalData": False,
            "verifyLeadsEnrichmentEmails": False,
        }

        url = f"https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token={token}"

        try:
            # Set timeout to 240 seconds to allow the synchronous scraping operation to finish
            res = requests.post(url, json=body, timeout=240)

            print("status:", res.status_code)
            if res.status_code not in [200, 201]:
                print("Apify error response:", res.text)
                return Response(
                    {"error": f"Apify search failed with status {res.status_code}: {res.text[:300]}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )
            
            items = res.json()
            if not isinstance(items, list):
                print("Apify returned non-list response:", items)
                return Response(
                    {"error": f"Apify API returned an invalid response format (expected a list, got {type(items).__name__})."},
                    status=status.HTTP_502_BAD_GATEWAY
                )
        except requests.RequestException as e:
            print(f"Failed to connect to Apify ({str(e)})")
            return Response(
                {"error": f"Failed to connect to Apify API: {str(e)}"},
                status=status.HTTP_504_GATEWAY_TIMEOUT
            )

        saved_companies = []
        for it in items:
            if not isinstance(it, dict):
                continue
            # Map fields safely with robust fallback keys
            name = str(it.get('title') or it.get('name') or it.get('companyName') or '').strip()
            if not name:
                continue

            category = it.get('categoryName') or it.get('category') or it.get('type') or ''
            if not category and isinstance(it.get('categories'), list):
                category = ", ".join(str(c) for c in it.get('categories') if c)
                
            comp_loc = str(it.get('city') or it.get('neighborhood') or it.get('state') or '').strip()
            if not comp_loc:
                comp_loc = location
                
            address = str(it.get('address') or '').strip()
            phone = str(it.get('phone') or it.get('phoneNumber') or it.get('phoneUnformatted') or it.get('phoneInternational') or it.get('telephone') or '').strip()
            website = str(it.get('website') or '').strip()
            
            gmaps_url = str(it.get('url') or '').strip()
            if not gmaps_url:
                place_id = it.get('placeId')
                if place_id:
                    gmaps_url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
                else:
                    import urllib.parse
                    safe_name = urllib.parse.quote_plus(name)
                    safe_address = urllib.parse.quote_plus(address or comp_loc)
                    gmaps_url = f"https://www.google.com/maps/search/?api=1&query={safe_name}+{safe_address}"
                
            rating = it.get('totalScore') if it.get('totalScore') is not None else it.get('rating')
            if rating is None:
                rating = it.get('score')
                
            total_score = it.get('totalScore') if it.get('totalScore') is not None else it.get('rating')
            if total_score is None:
                total_score = it.get('score')
                
            reviews_count = it.get('reviewsCount') if it.get('reviewsCount') is not None else it.get('reviews')
            if reviews_count is None:
                reviews_count = it.get('reviews_count')

            try:
                rating = float(rating) if rating is not None else None
            except (ValueError, TypeError):
                rating = None
            try:
                total_score = float(total_score) if total_score is not None else None
            except (ValueError, TypeError):
                total_score = None
            try:
                reviews_count = int(reviews_count) if reviews_count is not None else None
            except (ValueError, TypeError):
                reviews_count = None

            # Create or update company based on unique url
            company, _ = Company.objects.update_or_create(
                url=gmaps_url,
                defaults={
                    "name": name,
                    "category": category,
                    "location": comp_loc,
                    "address": address,
                    "phone": phone,
                    "website": website,
                    "rating": rating,
                    "total_score": total_score,
                    "reviews_count": reviews_count,
                }
            )
            saved_companies.append(company)

        # Create SearchQuery and link companies
        search_query = SearchQuery.objects.create(
            location=location,
            company_type=company_type
        )
        search_query.companies.set(saved_companies)

        # Return serialized list
        serializer = CompanySerializer(saved_companies, many=True)
        return Response(serializer.data)

class CompanyListView(ListAPIView):
    queryset = Company.objects.all().order_by('-id')
    serializer_class = CompanySerializer
