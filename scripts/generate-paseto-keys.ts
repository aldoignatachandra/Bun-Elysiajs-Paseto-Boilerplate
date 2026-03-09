/**
 * PASETO Key Generator
 *
 * Generates PASERK-format keys for hybrid PASETO implementation:
 * - k4.local: Symmetric key for v4.local (encrypted access tokens)
 * - k4.secret: Private key for v4.public (signing refresh tokens)
 * - k4.public: Public key for v4.public (verifying refresh tokens)
 *
 * Usage: bun run scripts/generate-paseto-keys.ts
 *
 * SECURITY NOTES:
 * - NEVER commit k4.secret to git!
 * - Store keys in environment variables or secret management
 * - Generate keys once per environment (dev, staging, prod)
 * - Keep k4.secret and k4.local safe - anyone with them can create tokens!
 */
/* eslint-disable no-console */
import { generateKeys } from 'paseto-ts/v4';

console.log('🔐 PASETO Key Generator (Hybrid v4.local + v4.public)');
console.log('='.repeat(60));
console.log('');

// Generate v4.local key (symmetric encryption)
console.log('📦 Generating v4.local key (for encrypted access tokens)...');
const localKey = generateKeys('local');
console.log('✅ Local key generated');
console.log('');

// Generate v4.public key pair (asymmetric signing)
console.log('🔑 Generating v4.public key pair (for signed refresh tokens)...');
const { secretKey, publicKey } = generateKeys('public');
console.log('✅ Key pair generated');
console.log('');

// Output in .env format
console.log('='.repeat(60));
console.log('');
console.log('✨ Add these to your .env file:');
console.log('');
console.log('# v4.local key for encrypted access tokens (KEEP SECRET!)');
console.log(`PASETO_LOCAL_KEY=${localKey}`);
console.log('');
console.log('# v4.public keys for signed refresh tokens');
console.log(`PASETO_PUBLIC_KEY=${publicKey}`);
console.log('');
console.log('⚠️  NEVER COMMIT THIS TO GIT:');
console.log(`PASETO_SECRET_KEY=${secretKey}`);
console.log('');
console.log('='.repeat(60));
console.log('');
console.log('📚 Key Types Explained:');
console.log('');
console.log('v4.local (Symmetric Encryption):');
console.log('  - Same key for encryption and decryption');
console.log('  - Payload is HIDDEN (encrypted)');
console.log('  - Use for: Access tokens with sensitive data');
console.log('  - Algorithm: XChaCha20-Poly1305');
console.log('');
console.log('v4.public (Asymmetric Signing):');
console.log('  - Private key signs, public key verifies');
console.log('  - Payload is READABLE (but tamper-proof)');
console.log('  - Use for: Refresh tokens, public verification');
console.log('  - Algorithm: Ed25519');
console.log('');
console.log('='.repeat(60));
