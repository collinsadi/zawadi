import * as argon2 from 'argon2';

/**
 * Hash a password using Argon2
 * @param password - The plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB
      timeCost: 3, // 3 iterations
      parallelism: 1 // 1 thread
    });
    
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Verify a password against a hash
 * @param password - The plain text password to verify
 * @param hash - The hashed password to compare against
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    throw new Error(`Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if a password needs to be rehashed (for upgrading hash parameters)
 * @param hash - The current password hash
 * @returns Promise<boolean> - True if password needs rehashing
 */
export const needsRehash = async (hash: string): Promise<boolean> => {
  try {
    // Try to verify with a dummy password to check if hash format is valid
    await argon2.verify(hash, 'dummy');
    return false; // Hash format is valid
  } catch {
    // If verification fails, it might be an old hash format
    return true;
  }
};
