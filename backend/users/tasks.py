"""Celery tasks for the users app."""

from celery import shared_task


@shared_task
def test_celery():
    """Test task to verify Celery is working correctly."""
    print("Celery is working!")
    return "Success"
