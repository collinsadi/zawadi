import { ethers } from 'ethers';
import { SignatureVerificationResult } from '../types';

/**
 * Verify a wallet signature using ethers
 * @param signature - The signature to verify
 * @param message - The original message that was signed
 * @param expectedAddress - The expected wallet address
 * @returns SignatureVerificationResult - Result of the verification
 */
export const verifySignature = (
  signature: string,
  message: string,
  expectedAddress: string
): SignatureVerificationResult => {
  try {
    // Verify the signature format
    if (!ethers.isHexString(signature, 65)) {
      return {
        isValid: false,
        error: 'Invalid signature format'
      };
    }

    // Verify the address format
    if (!ethers.isAddress(expectedAddress)) {
      return {
        isValid: false,
        error: 'Invalid address format'
      };
    }

    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Check if the recovered address matches the expected address
    const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

    return {
      isValid,
      recoveredAddress: recoveredAddress,
      error: isValid ? undefined : 'Address mismatch'
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Signature verification failed'
    };
  }
};

/**
 * Generate a nonce message for signature
 * @param nonce - The nonce value
 * @returns string - The formatted message to sign
 */
export const generateNonceMessage = (nonce: string): string => {
  return `Welcome to Zawadi, sign this message so that we will know it is actually you who is trying to sign in. This action will not cost any fee. Nonce: ${nonce}`;
};

/**
 * Validate the signature message format
 * @param message - The message to validate
 * @param nonce - The expected nonce
 * @returns boolean - True if message format is valid
 */
export const validateMessageFormat = (message: string, nonce: string): boolean => {
  const expectedMessage = generateNonceMessage(nonce);
  return message === expectedMessage;
};
