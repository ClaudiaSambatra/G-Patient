import pytest
from django.test import Client


@pytest.mark.django_db
def test_health():
    response = Client().get("/api/health/")
    assert response.status_code == 200
