/**
 * Storage Service
 *
 * Provides a high-level file storage layer with support for:
 * - Local file storage
 * - File validation (size, type, extension)
 * - Unique filename generation using crypto.randomUUID()
 * - Automatic directory creation
 * - Multiple storage provider support
 *
 * @module StorageService
 */

import { mkdir, writeFile, unlink, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import type { UploadOptions, UploadedFile, StorageProvider } from './storage.types';
import { logger } from '../logging/logger';
import { metricsCollector } from '../metrics/collector';

/**
 * Default maximum file size in bytes (5MB)
 */
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

/**
 * Default upload path for URLs
 */
const DEFAULT_UPLOAD_PATH = '/uploads';

/**
 * Local filesystem storage provider
 * Implements the StorageProvider interface for local file storage
 */
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly uploadDir: string) {}

  /**
   * Upload a file to local storage
   *
   * @param fileData - Buffer containing file data
   * @param fileName - Original filename
   * @param mimeType - MIME type of the file
   * @param options - Upload options for validation
   * @returns Uploaded file metadata
   */
  async upload(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
    options: UploadOptions = {}
  ): Promise<UploadedFile> {
    const startTime = Date.now();

    try {
      // Validate file data is not empty
      if (fileData.length === 0) {
        throw new Error('File is empty');
      }

      // Validate filename is not empty
      if (!fileName || fileName.trim().length === 0) {
        throw new Error('File name is empty');
      }

      // Validate file size
      const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
      if (fileData.length > maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
      }

      // Validate MIME type
      if (options.allowedTypes && options.allowedTypes.length > 0) {
        if (!options.allowedTypes.includes(mimeType)) {
          throw new Error(
            `File type '${mimeType}' not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
          );
        }
      }

      // Validate file extension
      const fileExtension = extname(fileName);
      if (options.allowedExtensions && options.allowedExtensions.length > 0) {
        if (!options.allowedExtensions.includes(fileExtension)) {
          throw new Error(
            `File extension '${fileExtension}' not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`
          );
        }
      }

      // Ensure upload directory exists
      await this.ensureDirectoryExists(this.uploadDir);

      // Generate unique filename using crypto.randomUUID()
      const uniqueFileName = `${randomUUID()}${fileExtension}`;
      const filePath = join(this.uploadDir, uniqueFileName);

      // Write file to disk
      await writeFile(filePath, fileData);

      const uploadedFile: UploadedFile = {
        originalName: fileName,
        fileName: uniqueFileName,
        mimeType,
        size: fileData.length,
        path: filePath,
        url: '', // Will be set by StorageService
        uploadedAt: new Date(),
      };

      // Record metrics
      const duration = Date.now() - startTime;
      metricsCollector.recordStorageUpload('local', duration, fileData.length, true);
      logger.info('File uploaded successfully', {
        fileName: uniqueFileName,
        originalName: fileName,
        size: fileData.length,
        mimeType,
        duration,
      });

      return uploadedFile;
    } catch (error) {
      // Record failed metrics
      const duration = Date.now() - startTime;
      metricsCollector.recordStorageUpload('local', duration, fileData.length, false);
      logger.error('File upload failed', {
        fileName,
        mimeType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a file from local storage
   *
   * @param fileName - Filename to delete
   */
  async delete(fileName: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Prevent path traversal attacks
      const safeFileName = basename(fileName);
      const filePath = join(this.uploadDir, safeFileName);

      // Check if file exists
      if (!existsSync(filePath)) {
        logger.warn('Attempted to delete non-existent file', { fileName });
        return;
      }

      // Delete the file
      await unlink(filePath);

      const duration = Date.now() - startTime;
      metricsCollector.recordStorageDelete('local', duration, true);
      logger.info('File deleted successfully', { fileName, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      metricsCollector.recordStorageDelete('local', duration, false);
      logger.error('File deletion failed', {
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Re-throw for service-level handling
      throw error;
    }
  }

  /**
   * Get public URL for a file
   *
   * @param fileName - Filename to get URL for
   * @param baseUrl - Base URL for the file server
   * @param uploadPath - Optional custom upload path (default: '/uploads')
   * @returns Public URL to access the file
   */
  getUrl(fileName: string, baseUrl: string, uploadPath: string = DEFAULT_UPLOAD_PATH): string {
    // Prevent path traversal attacks
    const safeFileName = basename(fileName);

    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Ensure uploadPath starts with /
    const cleanUploadPath = uploadPath.startsWith('/') ? uploadPath : `/${uploadPath}`;

    return `${cleanBaseUrl}${cleanUploadPath}/${safeFileName}`;
  }

  /**
   * Ensure the upload directory exists
   *
   * @param dir - Directory path to check/create
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await stat(dir);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(dir, { recursive: true });
      logger.info('Created upload directory', { dir });
    }
  }
}

/**
 * High-level storage service
 * Provides a unified interface for file storage operations
 */
export class StorageService {
  constructor(private readonly provider: StorageProvider) {}

  /**
   * Upload a file
   *
   * @param fileData - Buffer containing file data
   * @param fileName - Original filename
   * @param mimeType - MIME type of the file
   * @param options - Upload options for validation
   * @returns Uploaded file metadata with URL
   */
  async uploadFile(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadedFile> {
    try {
      const uploadedFile = await this.provider.upload(fileData, fileName, mimeType, options);

      // Generate URL for the uploaded file
      uploadedFile.url = this.getFileUrl(uploadedFile.fileName);

      return uploadedFile;
    } catch (error) {
      logger.error('Storage service upload failed', {
        fileName,
        mimeType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a file
   *
   * @param fileName - Filename to delete
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.provider.delete(fileName);
    } catch (error) {
      logger.error('Storage service delete failed', {
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't re-throw - fail gracefully
    }
  }

  /**
   * Get public URL for a file
   *
   * @param fileName - Filename to get URL for
   * @param baseUrl - Optional base URL (default: from environment or '/')
   * @param uploadPath - Optional custom upload path (default: '/uploads')
   * @returns Public URL to access the file
   */
  getFileUrl(fileName: string, baseUrl?: string, uploadPath?: string): string {
    // Use provided base URL or default
    const effectiveBaseUrl = baseUrl || process.env.BASE_URL || '';
    return this.provider.getUrl(fileName, effectiveBaseUrl, uploadPath);
  }
}

// Export types for convenience
export type { UploadOptions, UploadedFile, StorageProvider } from './storage.types';
