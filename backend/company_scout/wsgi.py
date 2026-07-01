"""
WSGI config for company_scout project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'company_scout.settings')

application = get_wsgi_application()

# Run database migrations automatically on startup (e.g. Railway/Render deployment)
try:
    print("Running database migrations automatically on startup...")
    call_command('migrate', interactive=False)
    print("Database migrations applied successfully.")
except Exception as e:
    print(f"Error running database migrations: {e}")

