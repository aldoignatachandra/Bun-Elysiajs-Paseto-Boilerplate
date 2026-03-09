import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { compressionPlugin } from '@/plugins/compression.plugin';

// Define interfaces for test typing
interface TestData {
  message: string;
  data: string;
}

describe('Compression Plugin', () => {
  describe('Basic compression functionality', () => {
    it('should compress JSON responses above threshold', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test', () => {
        // Create a large JSON response (>1KB)
        return {
          data: 'x'.repeat(2000), // 2000+ bytes
        };
      });

      const response = await app
        .handle(
          new Request('http://localhost/test', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(async res => {
          const clonedResponse = res.clone();
          const body = await res.arrayBuffer();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
            body: body,
          };
        });

      // Verify Content-Encoding header is set
      expect(response.headers['content-encoding']).toBe('gzip');

      // Verify response is actually compressed (smaller than original)
      const originalSize = JSON.stringify({ data: 'x'.repeat(2000) }).length;
      expect(response.body.byteLength).toBeLessThan(originalSize);
    });

    it('should NOT compress responses below threshold', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test', () => {
        // Create a small response (<1KB)
        return {
          data: 'hello',
        };
      });

      const response = await app
        .handle(
          new Request('http://localhost/test', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      // Verify Content-Encoding header is NOT set
      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should NOT compress when client does not accept gzip', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test', () => {
        return {
          data: 'x'.repeat(2000),
        };
      });

      const response = await app
        .handle(
          new Request('http://localhost/test', {
            // No Accept-Encoding header
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      // Verify Content-Encoding header is NOT set
      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('Content type handling', () => {
    it('should compress application/json', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test-json', () => {
        return {
          data: 'x'.repeat(2000),
        };
      });

      const response = await app
        .handle(
          new Request('http://localhost/test-json', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should compress text/html', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test-html', () => {
        return new Response('<html>'.repeat(500), {
          headers: {
            'Content-Type': 'text/html',
          },
        });
      });

      const response = await app
        .handle(
          new Request('http://localhost/test-html', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should NOT compress images', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test-image', () => {
        return new Response(new Uint8Array(2000), {
          headers: {
            'Content-Type': 'image/jpeg',
          },
        });
      });

      const response = await app
        .handle(
          new Request('http://localhost/test-image', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      // Images should not be compressed
      expect(response.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('Configuration options', () => {
    it('should respect custom threshold', async () => {
      const app = new Elysia()
        .use(
          compressionPlugin({
            threshold: 100, // 100 bytes
          })
        )
        .get('/test', () => {
          // Create a response between default threshold and custom threshold
          return {
            data: 'x'.repeat(150), // 150 bytes - should be compressed with threshold of 100
          };
        });

      const response = await app
        .handle(
          new Request('http://localhost/test', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should respect custom compressible types', async () => {
      const app = new Elysia()
        .use(
          compressionPlugin({
            types: ['application/json'], // Only compress JSON
          })
        )
        .get('/test-json', () => {
          return {
            data: 'x'.repeat(2000),
          };
        })
        .get('/test-html', () => {
          return new Response('<html>'.repeat(500), {
            headers: {
              'Content-Type': 'text/html',
            },
          });
        });

      // Test JSON compression
      const jsonResponse = await app
        .handle(
          new Request('http://localhost/test-json', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      expect(jsonResponse.headers['content-encoding']).toBe('gzip');

      // Test HTML compression (should NOT be compressed)
      const htmlResponse = await app
        .handle(
          new Request('http://localhost/test-html', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      expect(htmlResponse.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('Response integrity', () => {
    it('should not break responses', async () => {
      const testData: TestData = {
        message: 'Hello, World!',
        data: 'x'.repeat(2000),
      };

      const app = new Elysia().use(compressionPlugin()).get('/test-json', () => {
        return testData;
      });

      const response = await app
        .handle(
          new Request('http://localhost/test-json', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(async res => {
          const clonedResponse = res.clone();
          const arrayBuffer = await res.arrayBuffer();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
            body: arrayBuffer,
          };
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-encoding']).toBe('gzip');

      // Decompress and verify content
      const decompressed = Bun.gunzipSync(new Uint8Array(response.body));
      const decompressedText = new TextDecoder().decode(decompressed);
      const parsedData = JSON.parse(decompressedText) as TestData;

      expect(parsedData.message).toBe(testData.message);
      expect(parsedData.data).toBe(testData.data);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty responses', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/empty', () => {
        return new Response('', {
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      });

      const response = await app
        .handle(
          new Request('http://localhost/empty', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      // Empty responses should not be compressed
      expect(response.headers['content-encoding']).toBeUndefined();
    });

    it('should handle null responses', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/null', () => {
        return null;
      });

      const response = await app
        .handle(
          new Request('http://localhost/null', {
            headers: {
              'Accept-Encoding': 'gzip',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      // Null responses should not cause errors
      expect(response.status).toBeLessThan(500);
    });

    it('should handle multiple encoding values in Accept-Encoding', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test-json', () => {
        return {
          data: 'x'.repeat(2000),
        };
      });

      const response = await app
        .handle(
          new Request('http://localhost/test-json', {
            headers: {
              'Accept-Encoding': 'deflate, gzip, br',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      expect(response.headers['content-encoding']).toBe('gzip');
    });

    it('should handle gzip with q-value', async () => {
      const app = new Elysia().use(compressionPlugin()).get('/test-json', () => {
        return {
          data: 'x'.repeat(2000),
        };
      });

      const response = await app
        .handle(
          new Request('http://localhost/test-json', {
            headers: {
              'Accept-Encoding': 'gzip;q=1.0, deflate;q=0.5',
            },
          })
        )
        .then(res => {
          const clonedResponse = res.clone();
          return {
            status: clonedResponse.status,
            headers: Object.fromEntries(clonedResponse.headers.entries()),
          };
        });

      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });
});
