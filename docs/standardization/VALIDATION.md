# Validation Error Handling

This boilerplate includes automatic validation error handling for Zod schemas. When a Zod validation fails, the error is caught and formatted into a consistent API response.

## How It Works

The validation middleware integrates with Elysia's `onError` hook to catch Zod validation errors and return standardized responses.

## Response Format

Validation errors return a `422 Unprocessable Entity` status with the following format:

```json
{
  "success": false,
  "message": "Multiple validation errors occurred",
  "data": {
    "code": "VALIDATION_FAILED",
    "message": "Multiple validation errors occurred",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email address",
        "code": "INVALID_EMAIL"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "code": "TOO_SHORT",
        "expected": "8"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-03-13T10:00:00.000Z",
    "request_id": "abc-123"
  }
}
```

## Field Error Codes

| Code             | Description               |
| ---------------- | ------------------------- |
| `INVALID_TYPE`   | Field has wrong type      |
| `REQUIRED`       | Required field is missing |
| `INVALID_STRING` | Invalid string value      |
| `TOO_SHORT`      | Value is too short        |
| `TOO_LONG`       | Value is too long         |
| `INVALID_EMAIL`  | Invalid email format      |
| `INVALID_URL`    | Invalid URL format        |
| `INVALID_NUMBER` | Invalid number value      |
| `TOO_SMALL`      | Number is too small       |
| `TOO_LARGE`      | Number is too large       |
| `INVALID_DATE`   | Invalid date value        |
| `INVALID_ARRAY`  | Value must be an array    |
| `TOO_FEW_ITEMS`  | Array has too few items   |
| `TOO_MANY_ITEMS` | Array has too many items  |
| `INVALID_OBJECT` | Value must be an object   |

## Usage

Validation errors are handled automatically. Simply use Zod schemas in your routes:

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().positive().max(120),
});

// If validation fails, the middleware catches it automatically
app.post('/users', async ({ body }) => {
  const validated = createUserSchema.parse(body);
  // ... handle validated data
});
```

## Nested Fields

Nested object fields are displayed with arrow notation:

```json
{
  "field": "user → Address → City",
  "message": "City is required"
}
```

Array items include their index:

```json
{
  "field": "items[0].name",
  "message": "Name must be a string"
}
```

## Configuration

The validation middleware is configured in `src/app.ts` and requires no additional setup. Validation errors are logged with context for debugging.
