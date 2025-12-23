/**
 * Image Compressor Utility
 * Compresses images client-side before upload to save bandwidth and storage.
 */

import { logger } from './logger.js';

export class ImageCompressor {
    constructor(config = {}) {
        this.config = {
            maxWidth: config.maxWidth || 1280, // Default to HD width
            maxHeight: config.maxHeight || 1280, // Default to HD height
            quality: config.quality || 0.8, // 80% JPEG quality
            ...config
        };
    }

    /**
     * Compress an image file
     * @param {File} file - The original image file
     * @returns {Promise<File|Blob>} - The compressed file
     */
    async compress(file) {
        // Skip if not an image
        if (!file.type.startsWith('image/')) {
            logger.warn('Skipping compression: not an image');
            return file;
        }

        // Skip if already small (< 500KB)
        if (file.size < 0.5 * 1024 * 1024) {
            logger.debug('Skipping compression: file small enough');
            return file;
        }

        try {
            const bitmap = await createImageBitmap(file);
            const { width, height } = this.calculateDimensions(bitmap.width, bitmap.height);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0, width, height);

            // Convert to blob
            const compressedBlob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', this.config.quality);
            });

            if (!compressedBlob) {
                throw new Error('Canvas toBlob failed');
            }

            // Check if compression actually reduced size
            if (compressedBlob.size > file.size) {
                logger.warn('Compression increased file size, using original');
                return file;
            }

            logger.info(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);

            // Return as File object (preserving name)
            return new File([compressedBlob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });

        } catch (error) {
            logger.error('Compression failed:', error);
            return file; // Fallback to original
        }
    }

    calculateDimensions(width, height) {
        let newWidth = width;
        let newHeight = height;

        if (width > this.config.maxWidth || height > this.config.maxHeight) {
            const ratio = width / height;

            if (width > height) {
                newWidth = this.config.maxWidth;
                newHeight = Math.round(newWidth / ratio);
            } else {
                newHeight = this.config.maxHeight;
                newWidth = Math.round(newHeight * ratio);
            }
        }

        return { width: newWidth, height: newHeight };
    }
}

export const imageCompressor = new ImageCompressor();
export default imageCompressor;
