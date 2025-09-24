import Cookies from 'js-cookie';

const COOKIE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_ID: 'userId',
} as const;

export class CookieService {
  /**
   * Set access token in cookies
   * @param token - JWT access token
   * @param expiresInDays - Token expiration in days (default: 7)
   */
  static setAccessToken(token: string, expiresInDays: number = 7): void {
    Cookies.set(COOKIE_KEYS.ACCESS_TOKEN, token, { 
      expires: expiresInDays,
      secure: import.meta.env.PROD,
      sameSite: 'strict'
    });
  }

  /**
   * Set refresh token in cookies
   * @param token - JWT refresh token
   * @param expiresInDays - Token expiration in days (default: 30)
   */
  static setRefreshToken(token: string, expiresInDays: number = 30): void {
    Cookies.set(COOKIE_KEYS.REFRESH_TOKEN, token, { 
      expires: expiresInDays,
      secure: import.meta.env.PROD,
      sameSite: 'strict'
    });
  }

  /**
   * Set user ID in cookies
   * @param userId - User ID
   * @param expiresInDays - Cookie expiration in days (default: 30)
   */
  static setUserId(userId: string, expiresInDays: number = 30): void {
    Cookies.set(COOKIE_KEYS.USER_ID, userId, { 
      expires: expiresInDays,
      secure: import.meta.env.PROD,
      sameSite: 'strict'
    });
  }

  /**
   * Get access token from cookies
   * @returns string | undefined
   */
  static getAccessToken(): string | undefined {
    return Cookies.get(COOKIE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token from cookies
   * @returns string | undefined
   */
  static getRefreshToken(): string | undefined {
    return Cookies.get(COOKIE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get user ID from cookies
   * @returns string | undefined
   */
  static getUserId(): string | undefined {
    return Cookies.get(COOKIE_KEYS.USER_ID);
  }

  /**
   * Check if user is authenticated
   * @returns boolean
   */
  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Clear all authentication cookies
   */
  static clearAuth(): void {
    Cookies.remove(COOKIE_KEYS.ACCESS_TOKEN);
    Cookies.remove(COOKIE_KEYS.REFRESH_TOKEN);
    Cookies.remove(COOKIE_KEYS.USER_ID);
  }

  /**
   * Clear specific cookie
   * @param key - Cookie key to remove
   */
  static removeCookie(key: string): void {
    Cookies.remove(key);
  }
}
