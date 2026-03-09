/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, unlinkSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import type {
  StorageService,
  LocalStorageProvider,
  UploadedFile,
} from '@/core/storage/storage.service';
import type { UploadOptions, StorageProvider } from '@/core/storage/storage.types';
import { rm } from 'fs/promises';
import {
  StorageService as StorageServiceClass,
  LocalStorageProvider as LocalStorageProviderClass,
} from '@/core/storage/storage.service';

// Type checks are done at compile time, so we just need to verify the types exist
type _UploadOptions = UploadOptions;
type _UploadedFile = UploadedFile;
type _StorageProvider = StorageProvider;

describe('Storage Service', () => {
  const testUploadsDir = join(process.cwd(), 'test-uploads');
  let storageService: StorageService;
  let localStorageProvider: LocalStorageProvider;

  beforeEach(async () => {
    // Clean up test uploads directory before each test
    try {
      await rm(testUploadsDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, which is fine
    }
  });

  afterEach(async () => {
    // Clean up test uploads directory after each test
    try {
      await rm(testUploadsDir, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, which is fine
    }
  });

  describe('LocalStorageProvider', () => {
    beforeEach(() => {
      localStorageProvider = new LocalStorageProviderClass(testUploadsDir);
    });

    describe('upload', () => {
      it('should upload a file successfully', async () => {
        const fileData = Buffer.from('test file content');
        const fileName = 'test-file.txt';

        const result = await localStorageProvider.upload(fileData, fileName, 'text/plain');

        expect(result).toBeDefined();
        expect(result.originalName).toBe(fileName);
        expect(result.mimeType).toBe('text/plain');
        expect(result.size).toBe(fileData.length);
        expect(result.fileName).toMatch(/\.txt$/);
        expect(result.uploadedAt).toBeInstanceOf(Date);
        expect(existsSync(result.path)).toBe(true);
      });

      it('should generate unique filename using crypto.randomUUID()', async () => {
        const fileData = Buffer.from('test content');
        const fileName = 'test-file.png';

        const result1 = await localStorageProvider.upload(fileData, fileName, 'image/png');
        const result2 = await localStorageProvider.upload(fileData, fileName, 'image/png');

        expect(result1.fileName).not.toBe(result2.fileName);
        // Filenames should contain UUID pattern
        expect(result1.fileName).toMatch(/^[a-f0-9-]{36}\.png$/);
        expect(result2.fileName).toMatch(/^[a-f0-9-]{36}\.png$/);
      });

      it('should preserve file extension from original name', async () => {
        const testCases = [
          { name: 'photo.jpg', type: 'image/jpeg', expectedExt: '.jpg' },
          { name: 'document.pdf', type: 'application/pdf', expectedExt: '.pdf' },
          { name: 'archive.tar.gz', type: 'application/gzip', expectedExt: '.gz' },
          { name: 'noextension', type: 'text/plain', expectedExt: '' },
        ];

        for (const testCase of testCases) {
          const fileData = Buffer.from('content');
          const result = await localStorageProvider.upload(fileData, testCase.name, testCase.type);

          if (testCase.expectedExt) {
            expect(result.fileName.endsWith(testCase.expectedExt)).toBe(true);
          } else {
            expect(result.fileName.includes('.')).toBe(false);
          }
        }
      });

      it('should create uploads directory if it does not exist', async () => {
        const nonExistentDir = join(process.cwd(), 'test-uploads-new', 'nested', 'dir');
        const provider = new LocalStorageProviderClass(nonExistentDir);

        const fileData = Buffer.from('test');
        const result = await provider.upload(fileData, 'test.txt', 'text/plain');

        expect(existsSync(nonExistentDir)).toBe(true);
        expect(existsSync(result.path)).toBe(true);

        // Cleanup
        await rm(join(process.cwd(), 'test-uploads-new'), { recursive: true, force: true });
      });

      it('should validate file size against maxSize option', async () => {
        const fileData = Buffer.alloc(2 * 1024 * 1024); // 2MB
        const options: UploadOptions = {
          maxSize: 1 * 1024 * 1024, // 1MB
        };

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(
          localStorageProvider.upload(fileData, 'large.jpg', 'image/jpeg', options)
        ).rejects.toThrow('File size exceeds maximum allowed');
      });

      it('should validate file MIME type against allowedTypes', async () => {
        const fileData = Buffer.from('fake image');
        const options: UploadOptions = {
          allowedTypes: ['image/jpeg', 'image/png'],
        };

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(
          localStorageProvider.upload(fileData, 'test.pdf', 'application/pdf', options)
        ).rejects.toThrow("File type 'application/pdf' not allowed");
      });

      it('should validate file extension against allowedExtensions', async () => {
        const fileData = Buffer.from('content');
        const options: UploadOptions = {
          allowedExtensions: ['.jpg', '.png', '.gif'],
        };

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(
          localStorageProvider.upload(fileData, 'test.pdf', 'application/pdf', options)
        ).rejects.toThrow("File extension '.pdf' not allowed");
      });

      it('should allow file when all validations pass', async () => {
        const fileData = Buffer.alloc(500 * 1024); // 500KB
        const options: UploadOptions = {
          maxSize: 1 * 1024 * 1024, // 1MB
          allowedTypes: ['image/jpeg'],
          allowedExtensions: ['.jpg', '.jpeg'],
        };

        const result = await localStorageProvider.upload(
          fileData,
          'photo.jpg',
          'image/jpeg',
          options
        );

        expect(result.fileName).toMatch(/\.jpg$/);
        expect(existsSync(result.path)).toBe(true);
      });

      it('should handle empty file data', async () => {
        const fileData = Buffer.alloc(0);

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(
          localStorageProvider.upload(fileData, 'empty.txt', 'text/plain')
        ).rejects.toThrow('File is empty');
      });

      it('should store file data correctly', async () => {
        const fileData = Buffer.from('Hello, World!');
        const result = await localStorageProvider.upload(fileData, 'hello.txt', 'text/plain');

        const storedContent = readFileSync(result.path);
        expect(storedContent).toEqual(fileData);
      });
    });

    describe('delete', () => {
      it('should delete an existing file', async () => {
        const fileData = Buffer.from('to be deleted');
        const uploaded = await localStorageProvider.upload(fileData, 'delete-me.txt', 'text/plain');

        expect(existsSync(uploaded.path)).toBe(true);

        await localStorageProvider.delete(uploaded.fileName);

        expect(existsSync(uploaded.path)).toBe(false);
      });

      it('should handle deleting non-existent file gracefully', async () => {
        // Should not throw
        await localStorageProvider.delete('non-existent-file.txt');
        expect(true).toBe(true);
      });

      it('should handle deleting with path traversal attempts', async () => {
        // Should handle path traversal gracefully by sanitizing filename
        // basename() will extract 'etc/passwd' from '../etc/passwd'
        await localStorageProvider.delete('../etc/passwd');
        // Should not throw, just handle it gracefully
        expect(true).toBe(true);
      });
    });

    describe('getUrl', () => {
      it('should return a URL for the uploaded file', async () => {
        const fileData = Buffer.from('test');
        const baseUrl = 'https://example.com';
        const uploaded = await localStorageProvider.upload(fileData, 'test.jpg', 'image/jpeg');

        const url = localStorageProvider.getUrl(uploaded.fileName, baseUrl);

        expect(url).toBe(`${baseUrl}/uploads/${uploaded.fileName}`);
      });

      it('should handle custom upload path in URL', async () => {
        const fileData = Buffer.from('test');
        const baseUrl = 'https://cdn.example.com';
        const uploaded = await localStorageProvider.upload(fileData, 'test.png', 'image/png');

        const url = localStorageProvider.getUrl(uploaded.fileName, baseUrl, '/static/uploads');

        expect(url).toBe(`${baseUrl}/static/uploads/${uploaded.fileName}`);
      });

      it('should handle URL without trailing slash', async () => {
        const fileData = Buffer.from('test');
        const uploaded = await localStorageProvider.upload(fileData, 'test.pdf', 'application/pdf');

        const url = localStorageProvider.getUrl(uploaded.fileName, 'https://example.com/api');

        expect(url).toBe('https://example.com/api/uploads/' + uploaded.fileName);
      });
    });
  });

  describe('StorageService', () => {
    beforeEach(() => {
      localStorageProvider = new LocalStorageProviderClass(testUploadsDir);
      storageService = new StorageServiceClass(localStorageProvider);
    });

    describe('uploadFile', () => {
      it('should upload a file and return UploadedFile metadata', async () => {
        const fileData = Buffer.from('test file');
        const fileName = 'test-file.txt';
        const mimeType = 'text/plain';

        const result = await storageService.uploadFile(fileData, fileName, mimeType);

        expect(result).toBeDefined();
        expect(result.originalName).toBe(fileName);
        expect(result.fileName).toBeDefined();
        expect(result.mimeType).toBe(mimeType);
        expect(result.size).toBe(fileData.length);
        expect(result.path).toBeDefined();
        expect(result.url).toBeDefined();
        expect(result.uploadedAt).toBeInstanceOf(Date);
      });

      it('should pass options to provider for validation', async () => {
        const fileData = Buffer.alloc(2 * 1024 * 1024);
        const options: UploadOptions = {
          maxSize: 1 * 1024 * 1024,
        };

        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(
          storageService.uploadFile(fileData, 'large.jpg', 'image/jpeg', options)
        ).rejects.toThrow('File size exceeds maximum allowed');
      });

      it('should handle upload errors and log them', async () => {
        const fileData = Buffer.from('test');

        // Test with empty filename - should throw
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await expect(storageService.uploadFile(fileData, '', 'text/plain')).rejects.toThrow(
          'File name is empty'
        );
      });
    });

    describe('deleteFile', () => {
      it('should delete a file by filename', async () => {
        const fileData = Buffer.from('delete test');
        const uploaded = await storageService.uploadFile(fileData, 'delete.txt', 'text/plain');

        expect(existsSync(uploaded.path)).toBe(true);

        await storageService.deleteFile(uploaded.fileName);

        expect(existsSync(uploaded.path)).toBe(false);
      });

      it('should handle deleting non-existent file', async () => {
        // Should not throw
        await storageService.deleteFile('does-not-exist.txt');
        expect(true).toBe(true);
      });
    });

    describe('getFileUrl', () => {
      it('should return URL for uploaded file', async () => {
        const fileData = Buffer.from('url test');
        const uploaded = await storageService.uploadFile(fileData, 'url-test.jpg', 'image/jpeg');

        const url = storageService.getFileUrl(uploaded.fileName);

        expect(url).toBeDefined();
        expect(url).toContain('/uploads/');
        expect(url).toContain(uploaded.fileName);
      });

      it('should return URL with custom base URL', async () => {
        const fileData = Buffer.from('cdn test');
        const uploaded = await storageService.uploadFile(fileData, 'cdn-test.png', 'image/png');
        const baseUrl = 'https://cdn.example.com';

        const url = storageService.getFileUrl(uploaded.fileName, baseUrl);

        expect(url).toBe(`${baseUrl}/uploads/${uploaded.fileName}`);
      });

      it('should handle custom upload path', async () => {
        const fileData = Buffer.from('path test');
        const uploaded = await storageService.uploadFile(
          fileData,
          'path-test.pdf',
          'application/pdf'
        );
        const baseUrl = 'https://example.com';
        const uploadPath = '/static';

        const url = storageService.getFileUrl(uploaded.fileName, baseUrl, uploadPath);

        expect(url).toBe(`${baseUrl}${uploadPath}/${uploaded.fileName}`);
      });
    });
  });

  describe('Storage Types', () => {
    it('should define UploadOptions interface', () => {
      // Type check is done at compile time
      // This test just verifies the module loads correctly
      expect(true).toBe(true);
    });

    it('should define UploadedFile interface', () => {
      // Type check is done at compile time
      expect(true).toBe(true);
    });

    it('should define StorageProvider interface', () => {
      // Type check is done at compile time
      expect(true).toBe(true);
    });

    it('should export all types from storage.service', () => {
      expect(StorageServiceClass).toBeDefined();
      expect(LocalStorageProviderClass).toBeDefined();
    });
  });

  describe('Integration: Multiple file uploads', () => {
    beforeEach(() => {
      localStorageProvider = new LocalStorageProviderClass(testUploadsDir);
      storageService = new StorageServiceClass(localStorageProvider);
    });

    it('should handle multiple file uploads with unique names', async () => {
      const fileData = Buffer.from('multi test');
      const uploads: UploadedFile[] = [];

      for (let i = 0; i < 5; i++) {
        const uploaded = await storageService.uploadFile(fileData, 'same-name.jpg', 'image/jpeg');
        uploads.push(uploaded);
      }

      // All filenames should be unique
      const uniqueNames = new Set(uploads.map(u => u.fileName));
      expect(uniqueNames.size).toBe(5);

      // All files should exist
      for (const uploaded of uploads) {
        expect(existsSync(uploaded.path)).toBe(true);
      }
    });

    it('should handle batch delete operations', async () => {
      const fileData = Buffer.from('batch test');
      const uploads: UploadedFile[] = [];

      for (let i = 0; i < 3; i++) {
        const uploaded = await storageService.uploadFile(fileData, `batch-${i}.txt`, 'text/plain');
        uploads.push(uploaded);
      }

      // Delete all files
      for (const uploaded of uploads) {
        await storageService.deleteFile(uploaded.fileName);
      }

      // All files should be deleted
      for (const uploaded of uploads) {
        expect(existsSync(uploaded.path)).toBe(false);
      }
    });

    it('should handle large file uploads', async () => {
      const fileData = Buffer.alloc(5 * 1024 * 1024); // 5MB
      const options: UploadOptions = {
        maxSize: 10 * 1024 * 1024, // 10MB
      };

      const uploaded = await storageService.uploadFile(
        fileData,
        'large.bin',
        'application/octet-stream',
        options
      );

      expect(uploaded.size).toBe(5 * 1024 * 1024);
      expect(existsSync(uploaded.path)).toBe(true);

      const stats = statSync(uploaded.path);
      expect(stats.size).toBe(5 * 1024 * 1024);
    });
  });
});
