"""
File Validation Service - TuCitaSegura

Comprehensive file validation including:
- File size validation
- MIME type verification (not just extension)
- Format whitelisting
- Security checks against malicious files
- Image validation
"""

import magic
import mimetypes
from typing import Optional, List, Dict, Any, BinaryIO
from pathlib import Path
from io import BytesIO
import logging
from PIL import Image
from fastapi import UploadFile, HTTPException
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class FileValidationResult:
    """Result of file validation"""
    is_valid: bool
    mime_type: str
    extension: str
    size_bytes: int
    errors: List[str]
    warnings: List[str]
    metadata: Dict[str, Any]


class FileValidator:
    """
    Secure file validation service

    Features:
    - MIME type detection (real content, not extension)
    - Size validation
    - Format whitelisting
    - Security checks
    - Image validation (dimensions, format)
    """

    # Allowed MIME types for different file categories
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif'
    }

    ALLOWED_DOCUMENT_TYPES = {
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    }

    # Dangerous MIME types (never allow)
    DANGEROUS_TYPES = {
        'application/x-executable',
        'application/x-dosexec',
        'application/x-mach-binary',
        'application/x-sh',
        'application/x-shellscript',
        'text/x-script.python',
        'text/x-php',
        'application/javascript',
        'text/javascript',
        'application/x-httpd-php'
    }

    # Suspicious file extensions
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.sh', '.app', '.deb', '.rpm',
        '.msi', '.dmg', '.pkg', '.run', '.bin', '.com', '.scr',
        '.vbs', '.js', '.jar', '.apk', '.ipa', '.py', '.php',
        '.asp', '.aspx', '.jsp', '.cgi'
    }

    def __init__(self):
        """Initialize file validator"""
        self.max_image_size = settings.CV_MAX_IMAGE_SIZE  # 5MB
        self.max_document_size = 10 * 1024 * 1024  # 10MB

        # Parse allowed formats from settings
        self.allowed_image_formats = {
            fmt.strip().lower()
            for fmt in settings.CV_ALLOWED_FORMATS.split(',')
        }

        logger.info(f"FileValidator initialized with max image size: {self.max_image_size}")

    async def validate_upload_file(
        self,
        file: UploadFile,
        category: str = 'image',
        max_size: Optional[int] = None
    ) -> FileValidationResult:
        """
        Validate an uploaded file

        Args:
            file: FastAPI UploadFile object
            category: File category ('image', 'document')
            max_size: Optional custom max size in bytes

        Returns:
            FileValidationResult

        Raises:
            HTTPException: If file is invalid
        """
        errors = []
        warnings = []
        metadata = {}

        # Read file content
        try:
            content = await file.read()
            await file.seek(0)  # Reset file pointer
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            raise HTTPException(status_code=400, detail="Could not read file")

        # Validate size
        size_bytes = len(content)
        metadata['size_bytes'] = size_bytes
        metadata['size_mb'] = round(size_bytes / (1024 * 1024), 2)

        max_allowed_size = max_size or (
            self.max_image_size if category == 'image' else self.max_document_size
        )

        if size_bytes > max_allowed_size:
            errors.append(
                f"File too large: {metadata['size_mb']}MB "
                f"(max: {max_allowed_size / (1024 * 1024)}MB)"
            )

        if size_bytes == 0:
            errors.append("File is empty")

        # Detect real MIME type from content
        try:
            mime = magic.from_buffer(content, mime=True)
            metadata['detected_mime'] = mime
        except Exception as e:
            logger.error(f"Error detecting MIME type: {e}")
            errors.append("Could not detect file type")
            mime = 'application/octet-stream'

        # Get extension from filename
        file_path = Path(file.filename) if file.filename else Path('unknown')
        extension = file_path.suffix.lower()
        metadata['extension'] = extension
        metadata['filename'] = file.filename

        # Check for dangerous extensions
        if extension in self.DANGEROUS_EXTENSIONS:
            errors.append(f"Dangerous file extension: {extension}")

        # Check for dangerous MIME types
        if mime in self.DANGEROUS_TYPES:
            errors.append(f"Dangerous file type detected: {mime}")

        # Validate based on category
        if category == 'image':
            image_errors, image_warnings, image_metadata = self._validate_image(
                content, mime, extension
            )
            errors.extend(image_errors)
            warnings.extend(image_warnings)
            metadata.update(image_metadata)
        elif category == 'document':
            doc_errors, doc_metadata = self._validate_document(
                content, mime, extension
            )
            errors.extend(doc_errors)
            metadata.update(doc_metadata)

        # Check MIME type vs extension mismatch
        expected_mime = mimetypes.guess_type(file.filename)[0] if file.filename else None
        if expected_mime and mime != expected_mime:
            warnings.append(
                f"MIME type mismatch: extension suggests {expected_mime}, "
                f"but content is {mime}"
            )

        is_valid = len(errors) == 0

        return FileValidationResult(
            is_valid=is_valid,
            mime_type=mime,
            extension=extension,
            size_bytes=size_bytes,
            errors=errors,
            warnings=warnings,
            metadata=metadata
        )

    def _validate_image(
        self,
        content: bytes,
        mime: str,
        extension: str
    ) -> tuple[List[str], List[str], Dict[str, Any]]:
        """Validate image file"""
        errors = []
        warnings = []
        metadata = {}

        # Check MIME type
        if mime not in self.ALLOWED_IMAGE_TYPES:
            errors.append(
                f"Invalid image type: {mime}. "
                f"Allowed: {', '.join(self.ALLOWED_IMAGE_TYPES)}"
            )

        # Check extension
        ext_without_dot = extension.lstrip('.')
        if ext_without_dot not in self.allowed_image_formats:
            errors.append(
                f"Invalid image format: {extension}. "
                f"Allowed: {', '.join(self.allowed_image_formats)}"
            )

        # Validate with PIL
        try:
            img = Image.open(BytesIO(content))
            metadata['width'] = img.width
            metadata['height'] = img.height
            metadata['format'] = img.format
            metadata['mode'] = img.mode

            # Validate dimensions
            if img.width < 100 or img.height < 100:
                warnings.append(
                    f"Image too small: {img.width}x{img.height} "
                    "(minimum recommended: 100x100)"
                )

            if img.width > 8000 or img.height > 8000:
                warnings.append(
                    f"Image very large: {img.width}x{img.height} "
                    "(may cause performance issues)"
                )

            # Validate aspect ratio (prevent extreme ratios)
            aspect_ratio = img.width / img.height
            if aspect_ratio > 5 or aspect_ratio < 0.2:
                warnings.append(
                    f"Unusual aspect ratio: {aspect_ratio:.2f} "
                    "(image may be distorted)"
                )

            # Verify image can be loaded (detect corrupted files)
            img.verify()

        except Exception as e:
            errors.append(f"Invalid or corrupted image: {str(e)}")
            logger.error(f"Image validation error: {e}")

        return errors, warnings, metadata

    def _validate_document(
        self,
        content: bytes,
        mime: str,
        extension: str
    ) -> tuple[List[str], Dict[str, Any]]:
        """Validate document file"""
        errors = []
        metadata = {}

        # Check MIME type
        if mime not in self.ALLOWED_DOCUMENT_TYPES:
            errors.append(
                f"Invalid document type: {mime}. "
                f"Allowed: {', '.join(self.ALLOWED_DOCUMENT_TYPES)}"
            )

        # Check for embedded scripts (basic check)
        if b'<script' in content.lower() or b'javascript:' in content.lower():
            errors.append("Document contains potentially malicious scripts")

        return errors, metadata

    def validate_file_sync(
        self,
        file_path: str,
        category: str = 'image'
    ) -> FileValidationResult:
        """
        Validate a file from filesystem (synchronous)

        Args:
            file_path: Path to file
            category: File category

        Returns:
            FileValidationResult
        """
        errors = []
        warnings = []
        metadata = {}

        path = Path(file_path)

        # Check if file exists
        if not path.exists():
            errors.append(f"File not found: {file_path}")
            return FileValidationResult(
                is_valid=False,
                mime_type='',
                extension='',
                size_bytes=0,
                errors=errors,
                warnings=warnings,
                metadata=metadata
            )

        # Get file size
        size_bytes = path.stat().st_size
        metadata['size_bytes'] = size_bytes

        # Read file
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
        except Exception as e:
            errors.append(f"Could not read file: {e}")
            return FileValidationResult(
                is_valid=False,
                mime_type='',
                extension='',
                size_bytes=size_bytes,
                errors=errors,
                warnings=warnings,
                metadata=metadata
            )

        # Detect MIME type
        try:
            mime = magic.from_file(file_path, mime=True)
            metadata['detected_mime'] = mime
        except Exception as e:
            logger.error(f"Error detecting MIME type: {e}")
            errors.append("Could not detect file type")
            mime = 'application/octet-stream'

        extension = path.suffix.lower()
        metadata['extension'] = extension

        # Validate based on category
        if category == 'image':
            image_errors, image_warnings, image_metadata = self._validate_image(
                content, mime, extension
            )
            errors.extend(image_errors)
            warnings.extend(image_warnings)
            metadata.update(image_metadata)

        is_valid = len(errors) == 0

        return FileValidationResult(
            is_valid=is_valid,
            mime_type=mime,
            extension=extension,
            size_bytes=size_bytes,
            errors=errors,
            warnings=warnings,
            metadata=metadata
        )


# Global instance
file_validator = FileValidator()
