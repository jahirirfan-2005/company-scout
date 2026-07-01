from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch, MagicMock
from .models import Company, SearchQuery

class CompanyModelTest(TestCase):
    def setUp(self):
        self.company = Company.objects.create(
            name="Test IT Solutions",
            category="IT",
            location="Chennai",
            address="123 Tech Park, Chennai",
            phone="1234567890",
            website="https://example.com",
            url="https://google.com/maps/test-it",
            rating=4.5,
            total_score=4.5,
            reviews_count=25
        )

    def test_company_creation(self):
        self.assertEqual(self.company.name, "Test IT Solutions")
        self.assertEqual(self.company.category, "IT")
        self.assertEqual(self.company.location, "Chennai")
        self.assertEqual(self.company.url, "https://google.com/maps/test-it")
        self.assertEqual(self.company.rating, 4.5)
        self.assertEqual(self.company.reviews_count, 25)
        self.assertEqual(str(self.company), "Test IT Solutions")

    def test_search_query_creation(self):
        search_query = SearchQuery.objects.create(
            location="Chennai",
            company_type="IT"
        )
        search_query.companies.add(self.company)
        
        self.assertEqual(search_query.location, "Chennai")
        self.assertEqual(search_query.company_type, "IT")
        self.assertEqual(search_query.companies.count(), 1)
        self.assertEqual(search_query.companies.first(), self.company)
        self.assertIn("Search: 'IT' in 'Chennai'", str(search_query))

class CompanyAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.company = Company.objects.create(
            name="Test IT Solutions",
            category="IT",
            location="Chennai",
            address="123 Tech Park, Chennai",
            phone="1234567890",
            website="https://example.com",
            url="https://google.com/maps/test-it",
            rating=4.5,
            total_score=4.5,
            reviews_count=25
        )
        # Create a cached search query
        self.search_query = SearchQuery.objects.create(
            location="Chennai",
            company_type="IT"
        )
        self.search_query.companies.add(self.company)

    def test_search_cached_retrieval(self):
        # Post a search that matches our cached search query
        url = reverse('company-search')
        data = {
            "location": "Chennai",
            "companyType": "IT",
            "maxResults": 10
        }
        res = self.client.post(url, data, content_type="application/json")
        
        # Verify it retrieves cached results successfully without needing APIFY_API_TOKEN
        self.assertEqual(res.status_code, 200)
        json_data = res.json()
        self.assertEqual(len(json_data), 1)
        self.assertEqual(json_data[0]['name'], "Test IT Solutions")
        self.assertEqual(json_data[0]['reviewsCount'], 25)

    def test_list_companies(self):
        url = reverse('company-list')
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        json_data = res.json()
        # Since it's paginated/list, djangorestframework standard ListAPIView output depends on settings,
        # here we didn't specify pagination settings, so it's a flat list.
        self.assertEqual(len(json_data), 1)
        self.assertEqual(json_data[0]['name'], "Test IT Solutions")

    @patch('requests.post')
    def test_search_cache_miss_with_apify(self, mock_post):
        # Setup mock response for Apify API
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "title": "Apify Real Food Spot",
                "categoryName": "Restaurant",
                "city": "Chennai",
                "address": "456 High Rd, Chennai",
                "phone": "+91 99999 88888",
                "website": "https://apifyrealfood.com",
                "url": "https://www.google.com/maps/search/?api=1&query=Apify+Real+Food+Spot",
                "totalScore": 4.8,
                "reviewsCount": 120
            }
        ]
        mock_post.return_value = mock_response

        # Call the search view with a location/companyType combination NOT in cache
        url = reverse('company-search')
        data = {
            "location": "Mumbai",
            "companyType": "Restaurant",
            "maxResults": 5
        }
        res = self.client.post(url, data, content_type="application/json")

        self.assertEqual(res.status_code, 200)
        json_data = res.json()
        self.assertEqual(len(json_data), 1)
        self.assertEqual(json_data[0]['name'], "Apify Real Food Spot")
        self.assertEqual(json_data[0]['reviewsCount'], 120)
        self.assertEqual(json_data[0]['totalScore'], 4.8)
        self.assertEqual(json_data[0]['phone'], "+91 99999 88888")
        self.assertEqual(json_data[0]['website'], "https://apifyrealfood.com")
