// Export routes
export { default as authRoutes } from './routes/authRoutes';

// Export controllers
export { AuthController } from './controllers/authController';

// Export services
export { AuthService } from './services/authService';

// Export utilities
export { verifySignature, generateNonceMessage, validateMessageFormat } from './utils/signatureVerification';
export { 
  generateNonce, 
  storeNonce, 
  validateAndConsumeNonce, 
  getNonceForUser,
  cleanupExpiredNonces,
  getActiveNonceCount 
} from './utils/nonceGenerator';

// Export types
export type {
  AuthRequest,
  AuthResponse,
  SignatureVerificationResult,
  UserAuthData,
  TokenPair
} from './types';
