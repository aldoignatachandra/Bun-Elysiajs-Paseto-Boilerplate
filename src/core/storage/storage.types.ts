/**
 * Storage Type Definitions
 *
 * Defines the types and interfaces for the file storage layer.
 * Supports local file storage, file validation, and multiple storage providers.
 */

/**
 * Upload options for file validation and configuration
 */
export interface UploadOptions {
  /**
   * Maximum file size in bytes (default: 5242880 = 5MB)
   */
  maxSize?: number;

  /**
   * Allowed MIME types for upload (e.g., ['image/jpeg', 'image/png'])
   * If not provided, all MIME types are allowed
   */
  allowedTypes?: string[];

  /**
   * Allowed file extensions for upload (e.g., ['.jpg', '.png', '.pdf'])
   * If not provided, all extensions are allowed
   */
  allowedExtensions?: string[];
}

/**
 * Uploaded file metadata
 */
export interface UploadedFile {
  /**
   * Original filename provided during upload
   */
  originalName: string;

  /**
   * Generated unique filename (UUID-based)
   */
  fileName: string;

  /**
   * MIME type of the file
   */
  mimeType: string;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Full file system path to the stored file
   */
  path: string;

  /**
   * Public URL to access the file
   */
  url: string;

  /**
   * Timestamp when the file was uploaded
   */
  uploadedAt: Date;
}

/**
 * Storage provider interface
 * Implement this interface to support different storage backends
 * (e.g., local filesystem, S3, Azure Blob Storage, Google Cloud Storage)
 */
export interface StorageProvider {
  /**
   * Upload a file to storage
   *
   * @param fileData - Buffer containing file data
   * @param fileName - Original filename
   * @param mimeType - MIME type of the file
   * @param options - Upload options for validation
   * @returns Uploaded file metadata
   * @throws Error if validation fails or upload error occurs
   */
  upload(
    fileData: Buffer,
    fileName: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<UploadedFile>;

  /**
   * Delete a file from storage
   *
   * @param fileName - Filename to delete
   * @throws Error if deletion fails
   */
  delete(fileName: string): Promise<void>;

  /**
   * Get public URL for a file
   *
   * @param fileName - Filename to get URL for
   * @param baseUrl - Base URL for the file server
   * @param uploadPath - Optional custom upload path (default: '/uploads')
   * @returns Public URL to access the file
   */
  getUrl(fileName: string, baseUrl: string, uploadPath?: string): string;
}
