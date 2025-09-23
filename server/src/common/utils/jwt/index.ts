import jwt from 'jsonwebtoken';
import { ENVIRONMENT } from '../../config/environment';

export interface TokenPayload {
  userId: string;
  deviceId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface AccessTokenPayload extends Omit<TokenPayload, 'type'> {
  type: 'access';
}

export interface RefreshTokenPayload extends Omit<TokenPayload, 'type'> {
  type: 'refresh';
}

/**
 * Generate an access token
 * @param payload - The token payload
 * @returns string - The generated JWT token
 */
export const generateAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string => {
  const tokenPayload: AccessTokenPayload = {
    ...payload,
    type: 'access'
  };

  return jwt.sign(tokenPayload, ENVIRONMENT.APP.JWT_SECRET, {
    expiresIn: '15m', // 15 minutes
    issuer: 'sylis-auth',
    audience: 'sylis-users'
  });
};

/**
 * Generate a refresh token
 * @param payload - The token payload
 * @returns string - The generated JWT token
 */
export const generateRefreshToken = (payload: Omit<RefreshTokenPayload, 'type'>): string => {
  const tokenPayload: RefreshTokenPayload = {
    ...payload,
    type: 'refresh'
  };

  return jwt.sign(tokenPayload, ENVIRONMENT.APP.JWT_SECRET, {
    expiresIn: '7d', // 7 days
    issuer: 'sylis-auth',
    audience: 'sylis-users'
  });
};

/**
 * Verify and decode a JWT token
 * @param token - The JWT token to verify
 * @returns TokenPayload - The decoded token payload
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, ENVIRONMENT.APP.JWT_SECRET, {
      issuer: 'sylis-auth',
      audience: 'sylis-users'
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify an access token specifically
 * @param token - The access token to verify
 * @returns AccessTokenPayload - The decoded access token payload
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = verifyToken(token);
  
  if (payload.type !== 'access') {
    throw new Error('Invalid token type: expected access token');
  }

  return payload as AccessTokenPayload;
};

/**
 * Verify a refresh token specifically
 * @param token - The refresh token to verify
 * @returns RefreshTokenPayload - The decoded refresh token payload
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const payload = verifyToken(token);
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }

  return payload as RefreshTokenPayload;
};

/**
 * Decode a JWT token without verification (for debugging)
 * @param token - The JWT token to decode
 * @returns any - The decoded token payload
 */
export const decodeToken = (token: string): unknown => {
  return jwt.decode(token);
};

/**
 * Check if a token is expired
 * @param token - The JWT token to check
 * @returns boolean - True if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as { exp?: number };
    if (!decoded || typeof decoded.exp !== 'number') {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}; 