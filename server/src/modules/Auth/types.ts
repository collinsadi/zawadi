export interface AuthRequest {
  signature: string;
  message: string;
  address: string;
  nonce: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      walletAddress: string;
      createdAt: Date;
      updatedAt: Date;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
  error?: string;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  recoveredAddress?: string;
  error?: string;
}

export interface UserAuthData {
  id: string;
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
