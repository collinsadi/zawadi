import Cookies from 'js-cookie';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    tokens: AuthTokens;
  };
  error?: string;
}

export interface NonceResponse {
  success: boolean;
  message: string;
  data?: {
    nonce: string;
  };
  error?: string;
}

export interface AuthRequest {
  signature: string;
  message: string;
  address: string;
  nonce: string;
}

class AuthService {
  private baseUrl: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<AuthTokens | null> | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  }

  /**
   * Get access token from cookies
   */
  getAccessToken(): string | undefined {
    return Cookies.get('accessToken');
  }

  /**
   * Get refresh token from cookies
   */
  getRefreshToken(): string | undefined {
    return Cookies.get('refreshToken');
  }

  /**
   * Set tokens in cookies
   */
  setTokens(tokens: AuthTokens): void {
    Cookies.set('accessToken', tokens.accessToken, { expires: 1/96 }); // 15 minutes
    Cookies.set('refreshToken', tokens.refreshToken, { expires: 7 }); // 7 days
  }

  /**
   * Clear tokens from cookies
   */
  clearTokens(): void {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<AuthTokens | null> {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: AuthResponse = await response.json();
      
      if (data.success && data.data?.tokens) {
        this.setTokens(data.data.tokens);
        return data.data.tokens;
      } else {
        throw new Error(data.error || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Attempt to refresh token once
   */
  async attemptTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      // If already refreshing, wait for the existing promise
      if (this.refreshPromise) {
        const result = await this.refreshPromise;
        return !!result;
      }
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshAccessToken();

    try {
      const result = await this.refreshPromise;
      return !!result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Make an authenticated request with automatic token refresh
   */
  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAccessToken();
    
    console.log('Making authenticated request to:', endpoint);
    console.log('Token available:', !!token);
    console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'None');
    
    if (!token) {
      throw new Error('No access token available');
    }

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      if (response.status === 401) {
        // Token expired, try to refresh once
        const refreshSuccess = await this.attemptTokenRefresh();
        
        if (refreshSuccess) {
          // Retry the request with new token
          const newToken = this.getAccessToken();
          if (newToken) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            };
            
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, config);
            
            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({}));
              throw new Error(errorData.message || `HTTP error! status: ${retryResponse.status}`);
            }
            
            const data = await retryResponse.json();
            return data.data || data;
          }
        }
        
        // Refresh failed, user needs to re-authenticate
        this.clearTokens();
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearTokens();
    // You can add additional logout logic here (e.g., redirect to login page)
  }

  /**
   * Get nonce for wallet authentication
   * @param address - Wallet address
   * @returns Promise<NonceResponse>
   */
  async getNonce(address: string): Promise<NonceResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/nonce/${address}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get nonce',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Authenticate user with wallet signature
   * @param authData - Authentication request data
   * @returns Promise<AuthResponse>
   */
  async authenticate(authData: AuthRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.tokens) {
        // Store tokens in cookies upon successful authentication
        this.setTokens(data.data.tokens);
      }
      
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
