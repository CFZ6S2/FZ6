"""
Firebase Storage utilities for file uploads
Handles file uploads to Firebase Cloud Storage
"""

import os
from firebase_admin import storage
from dotenv import load_dotenv
from uuid import uuid4

load_dotenv()

bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "tuscitasseguras-2d1a6.firebasestorage.app")


def upload_file_to_storage(file, filename_prefix="upload"):
    """
    Upload a file to Firebase Storage

    Args:
        file: UploadFile object from FastAPI
        filename_prefix: Prefix for the generated filename

    Returns:
        str: Public URL of the uploaded file

    Raises:
        Exception: If upload fails
    """
    try:
        bucket = storage.bucket(bucket_name)

        # Generate unique filename
        unique_name = f"{filename_prefix}_{uuid4().hex}.jpg"

        # Create blob and upload
        blob = bucket.blob(unique_name)
        blob.upload_from_file(file.file, content_type=file.content_type)

        # Make public and return URL
        blob.make_public()
        return blob.public_url
    except Exception as e:
        raise Exception(f"Error uploading file to Firebase Storage: {str(e)}")


def upload_profile_photo(file, user_id: str, photo_type: str = "avatar"):
    """
    Upload a profile photo to Firebase Storage

    Args:
        file: UploadFile object
        user_id: User's Firebase UID
        photo_type: Type of photo (avatar, gallery_1, gallery_2, etc.)

    Returns:
        str: Public URL of the uploaded photo
    """
    try:
        bucket = storage.bucket(bucket_name)

        # Create path: profile_photos/{user_id}/{photo_type}
        blob_path = f"profile_photos/{user_id}/{photo_type}"

        blob = bucket.blob(blob_path)
        blob.upload_from_file(file.file, content_type=file.content_type)
        blob.make_public()

        return blob.public_url
    except Exception as e:
        raise Exception(f"Error uploading profile photo: {str(e)}")


def delete_file_from_storage(file_path: str):
    """
    Delete a file from Firebase Storage

    Args:
        file_path: Path of the file in the bucket

    Returns:
        bool: True if deleted successfully
    """
    try:
        bucket = storage.bucket(bucket_name)
        blob = bucket.blob(file_path)
        blob.delete()
        return True
    except Exception as e:
        print(f"Error deleting file: {str(e)}")
        return False
