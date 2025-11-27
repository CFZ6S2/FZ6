/**
 * File Validator - Frontend
 *
 * Client-side file validation before uploading to Firebase Storage
 * Provides security checks, MIME type validation, and size limits
 */

import { logger } from './logger.js';

// Allowed MIME types for images
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]);

// Dangerous file extensions (never allow)
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.app', '.deb', '.rpm',
  '.msi', '.dmg', '.pkg', '.run', '.bin', '.com', '.scr',
  '.vbs', '.js', '.jar', '.apk', '.ipa', '.py', '.php',
  '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.rb'
]);

// Max file sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validation result object
 */
export class FileValidationResult {
  constructor(isValid, errors = [], warnings = [], metadata = {}) {
    this.isValid = isValid;
    this.errors = errors;
    this.warnings = warnings;
    this.metadata = metadata;
  }
}

/**
 * File Validator class
 */
export class FileValidator {
  constructor() {
    this.maxImageSize = MAX_IMAGE_SIZE;
    this.maxDocumentSize = MAX_DOCUMENT_SIZE;
  }

  /**
   * Validate an image file
   * @param {File} file - File object to validate
   * @returns {Promise<FileValidationResult>}
   */
  async validateImage(file) {
    const errors = [];
    const warnings = [];
    const metadata = {};

    try {
      // Basic checks
      if (!file) {
        errors.push('No file provided');
        return new FileValidationResult(false, errors, warnings, metadata);
      }

      // File size
      metadata.sizeBytes = file.size;
      metadata.sizeMB = (file.size / (1024 * 1024)).toFixed(2);

      if (file.size === 0) {
        errors.push('File is empty');
      }

      if (file.size > this.maxImageSize) {
        errors.push(`File too large: ${metadata.sizeMB}MB (max: ${(this.maxImageSize / (1024 * 1024)).toFixed(0)}MB)`);
      }

      // File name and extension
      const fileName = file.name || 'unknown';
      const extension = this.getFileExtension(fileName);
      metadata.fileName = fileName;
      metadata.extension = extension;

      // Check dangerous extensions
      if (DANGEROUS_EXTENSIONS.has(extension.toLowerCase())) {
        errors.push(`Dangerous file extension: ${extension}`);
      }

      // MIME type validation
      const mimeType = file.type || '';
      metadata.mimeType = mimeType;

      if (!mimeType) {
        errors.push('Could not detect file type');
      } else if (!ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase())) {
        errors.push(`Invalid image type: ${mimeType}. Allowed: ${Array.from(ALLOWED_IMAGE_TYPES).join(', ')}`);
      }

      // Validate extension matches MIME type
      const expectedExtensions = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/webp': ['.webp'],
        'image/gif': ['.gif']
      };

      if (mimeType && expectedExtensions[mimeType]) {
        const allowed = expectedExtensions[mimeType];
        if (!allowed.includes(extension.toLowerCase())) {
          warnings.push(`Extension ${extension} doesn't match MIME type ${mimeType}`);
        }
      }

      // Load and validate image
      if (errors.length === 0) {
        try {
          const imageData = await this.loadImage(file);
          metadata.width = imageData.width;
          metadata.height = imageData.height;

          // Dimension checks
          if (imageData.width < 100 || imageData.height < 100) {
            warnings.push(`Image too small: ${imageData.width}x${imageData.height} (minimum recommended: 100x100)`);
          }

          if (imageData.width > 8000 || imageData.height > 8000) {
            warnings.push(`Image very large: ${imageData.width}x${imageData.height} (may cause performance issues)`);
          }

          // Aspect ratio
          const aspectRatio = imageData.width / imageData.height;
          metadata.aspectRatio = aspectRatio.toFixed(2);

          if (aspectRatio > 5 || aspectRatio < 0.2) {
            warnings.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)} (image may be distorted)`);
          }

        } catch (error) {
          errors.push(`Invalid or corrupted image: ${error.message}`);
          logger.error('Image validation error', error, { fileName });
        }
      }

      const isValid = errors.length === 0;

      logger.debug('File validation completed', {
        fileName,
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return new FileValidationResult(isValid, errors, warnings, metadata);

    } catch (error) {
      logger.error('File validation error', error);
      errors.push(`Validation error: ${error.message}`);
      return new FileValidationResult(false, errors, warnings, metadata);
    }
  }

  /**
   * Load and validate image file
   * @param {File} file
   * @returns {Promise<{width: number, height: number, img: HTMLImageElement}>}
   */
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          img
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Get file extension from filename
   * @param {string} fileName
   * @returns {string}
   */
  getFileExtension(fileName) {
    const parts = fileName.split('.');
    if (parts.length > 1) {
      return '.' + parts[parts.length - 1];
    }
    return '';
  }

  /**
   * Validate multiple files
   * @param {FileList|File[]} files
   * @returns {Promise<FileValidationResult[]>}
   */
  async validateImages(files) {
    const results = [];

    for (const file of files) {
      const result = await this.validateImage(file);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if file type is allowed
   * @param {string} mimeType
   * @returns {boolean}
   */
  isAllowedImageType(mimeType) {
    return ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase());
  }

  /**
   * Check if extension is dangerous
   * @param {string} extension
   * @returns {boolean}
   */
  isDangerousExtension(extension) {
    return DANGEROUS_EXTENSIONS.has(extension.toLowerCase());
  }

  /**
   * Format file size in human-readable format
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Helper function to show validation errors to user
 * @param {FileValidationResult} result
 * @param {Function} showToast - Toast notification function
 */
export function showValidationErrors(result, showToast) {
  if (!result.isValid) {
    result.errors.forEach(error => {
      showToast(error, 'error');
      logger.error('File validation error', { error });
    });
  }

  result.warnings.forEach(warning => {
    showToast(warning, 'warning');
    logger.warn('File validation warning', { warning });
  });
}

/**
 * Create upload preview with validation
 * @param {File} file
 * @param {FileValidationResult} validation
 * @returns {HTMLElement}
 */
export function createUploadPreview(file, validation) {
  const container = document.createElement('div');
  container.className = 'upload-preview';

  const validator = new FileValidator();

  // Preview image
  const preview = document.createElement('img');
  preview.src = URL.createObjectURL(file);
  preview.onload = () => URL.revokeObjectURL(preview.src);
  preview.className = 'preview-image';
  container.appendChild(preview);

  // File info
  const info = document.createElement('div');
  info.className = 'preview-info';

  const fileName = document.createElement('div');
  fileName.className = 'file-name';
  fileName.textContent = file.name;
  info.appendChild(fileName);

  const fileSize = document.createElement('div');
  fileSize.className = 'file-size';
  fileSize.textContent = validator.formatFileSize(file.size);
  info.appendChild(fileSize);

  if (validation.metadata.width && validation.metadata.height) {
    const dimensions = document.createElement('div');
    dimensions.className = 'file-dimensions';
    dimensions.textContent = `${validation.metadata.width} × ${validation.metadata.height}`;
    info.appendChild(dimensions);
  }

  container.appendChild(info);

  // Validation status
  const status = document.createElement('div');
  status.className = `validation-status ${validation.isValid ? 'valid' : 'invalid'}`;

  if (validation.isValid) {
    status.innerHTML = '<i class="fas fa-check-circle"></i> Válido';
    if (validation.warnings.length > 0) {
      status.innerHTML += ` <span class="warning-count">(${validation.warnings.length} avisos)</span>`;
    }
  } else {
    status.innerHTML = '<i class="fas fa-times-circle"></i> Inválido';
  }

  container.appendChild(status);

  // Errors and warnings
  if (validation.errors.length > 0 || validation.warnings.length > 0) {
    const messages = document.createElement('div');
    messages.className = 'validation-messages';

    validation.errors.forEach(error => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'validation-error';
      errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error}`;
      messages.appendChild(errorDiv);
    });

    validation.warnings.forEach(warning => {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'validation-warning';
      warningDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${warning}`;
      messages.appendChild(warningDiv);
    });

    container.appendChild(messages);
  }

  return container;
}

// Global instance
export const fileValidator = new FileValidator();

// Default export
export default fileValidator;
