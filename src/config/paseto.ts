import { getConfig } from './index';

/**
 * PASETO Configuration
 *
 * Hybrid approach for maximum learning:
 * - v4.local: Symmetric encryption for access tokens (encrypted payload)
 * - v4.public: Asymmetric signing for refresh tokens (signed payload)
 *
 * Why hybrid?
 * - Access tokens: Need encryption (hide sensitive data), short-lived
 * - Refresh tokens: Need revocation capability, longer-lived, asymmetric for microservices future
 * - Learn BOTH symmetric AND asymmetric cryptography
 */
export const pasetoConfig = {
  // v4.local key for encrypted access tokens (symmetric)
  localKey: getConfig().PASETO_LOCAL_KEY,

  // v4.public keys for signed refresh tokens (asymmetric)
  publicKey: getConfig().PASETO_PUBLIC_KEY,
  secretKey: getConfig().PASETO_SECRET_KEY,

  // Token expiry settings
  accessTokenExpiry: {
    value: getConfig().ACCESS_TOKEN_EXPIRY_MINUTES,
    unit: 'm' as const,
  },
  refreshTokenExpiry: {
    value: getConfig().REFRESH_TOKEN_EXPIRY_DAYS,
    unit: 'd' as const,
  },
} as const;
