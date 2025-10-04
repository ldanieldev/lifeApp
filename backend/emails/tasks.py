"""Async tasks for sending emails (future Celery integration)."""

# Future: Celery tasks for async email sending
# This file is prepared for future integration with Celery or similar task queue

# Example structure:
# from celery import shared_task
# from emails.services import EmailService
#
# @shared_task
# def send_password_reset_email_async(email: str, reset_url: str):
#     """Send password reset email asynchronously."""
#     return EmailService.send_password_reset_email(email, reset_url)
