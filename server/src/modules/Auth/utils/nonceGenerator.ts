import crypto from 'crypto';

// In-memory store for nonces (in production, consider using Redis)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

/**
 * Generate a secure random nonce
 * @returns string - A random 32-character hex string
 */
export const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Store a nonce with expiration time
 * @param userId - User identifier (can be wallet address or session ID)
 * @param expiresInMinutes - How long the nonce should be valid (default: 5 minutes)
 * @returns string - The generated nonce
 */
export const storeNonce = (userId: string, expiresInMinutes: number = 5): string => {
  const nonce = generateNonce();
  const expiresAt = Date.now() + (expiresInMinutes * 60 * 1000);
  
  nonceStore.set(userId, { nonce, expiresAt });
  
  return nonce;
};

/**
 * Validate and consume a nonce
 * @param userId - User identifier
 * @param nonce - The nonce to validate
 * @returns boolean - True if nonce is valid and was consumed
 */
export const validateAndConsumeNonce = (userId: string, nonce: string): boolean => {
  const stored = nonceStore.get(userId);
  
  if (!stored) {
    return false;
  }
  
  // Check if nonce has expired
  if (Date.now() > stored.expiresAt) {
    nonceStore.delete(userId);
    return false;
  }
  
  // Check if nonce matches
  if (stored.nonce !== nonce) {
    return false;
  }
  
  // Consume the nonce by removing it
  nonceStore.delete(userId);
  return true;
};

/**
 * Get a nonce for a user (for client requests)
 * @param userId - User identifier
 * @returns string - The nonce to sign
 */
export const getNonceForUser = (userId: string): string => {
  return storeNonce(userId);
};

/**
 * Clean up expired nonces (should be called periodically)
 */
export const cleanupExpiredNonces = (): void => {
  const now = Date.now();
  
  nonceStore.forEach(({ expiresAt }, userId) => {
    if (now > expiresAt) {
      nonceStore.delete(userId);
    }
  });
};

/**
 * Get the number of active nonces
 * @returns number - Count of active nonces
 */
export const getActiveNonceCount = (): number => {
  return nonceStore.size;
};

// Clean up expired nonces every 5 minutes
setInterval(cleanupExpiredNonces, 5 * 60 * 1000);
