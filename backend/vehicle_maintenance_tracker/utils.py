"""Utility functions for Vehicle Maintenance Tracker."""

import boto3
from botocore.config import Config
from django.conf import settings


def get_public_presigned_url(file_key: str, expiration: int = 3600) -> str:
    """Generate a presigned URL using the public endpoint.

    The default_storage.url() generates presigned URLs using the internal
    Docker hostname (e.g., garage:3900). This function generates a new
    presigned URL using the public endpoint so browsers can access it.

    Args:
        file_key: The S3 object key (path within the bucket)
        expiration: URL expiration time in seconds (default 1 hour)

    Returns:
        A presigned URL using the public endpoint, or empty string if no file_key

    """
    if not file_key:
        return ""

    public_endpoint = getattr(settings, "AWS_S3_PUBLIC_URL", None)
    endpoint_url = public_endpoint or settings.AWS_S3_ENDPOINT_URL

    # Create a separate S3 client for presigned URLs using the public endpoint
    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        config=Config(signature_version="s3v4"),
    )

    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": file_key},
        ExpiresIn=expiration,
    )
