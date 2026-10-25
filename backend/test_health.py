import pytest
from django.test import Client


@pytest.mark.django_db
def test_health():
    response = Client().get("/api/health/")
    assert response.status_code == 200


@pytest.mark.django_db
def test_metrics():
    response = Client().get("/api/metrics/")
    assert response.status_code == 200
    assert b"python_gc_objects_collected_total" in response.content or b"process_" in response.content
