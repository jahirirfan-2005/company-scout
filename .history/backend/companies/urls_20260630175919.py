from django.urls import path
from .views import CompanySearchView, CompanyListView

urlpatterns = [
    path('search/', CompanySearchView.as_view(), name='company-search'),
    path('', CompanyListView.as_view(), name='company-list'),
]
x