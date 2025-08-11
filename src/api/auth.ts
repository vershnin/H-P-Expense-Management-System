const API_BASE_URL = 'http://localhost:5000/api';

// Enhanced error handling interface
interface ApiError {
  message: string;
  error: string;
  status: number;
  details?: any;
}

// Response wrapper for consistent error handling
class ApiResponseHandler {
  static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: 'Network Error',
        status: response.status
      }));
      
      throw new Error(errorData.message || 'Request failed');
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format: Expected JSON');
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('Failed to parse JSON response');
    }
  }

  static createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }
}

export interface LoginRequest {
  email: string;
  password: string;
  role: string;
}

export interface AuthResponse {
  user: any;
  token: string;
  message: string;
}

export async function login(email: string, password: string, role: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, role }),
      signal: ApiResponseHandler.createTimeoutSignal(30000), // 30 second timeout
    });

    const responseData = await ApiResponseHandler.handleResponse<any>(response);
    
    // Handle both old and new response formats
    let token, user;
    
    if (responseData.data && responseData.data.token) {
      // New format from auth_routes_fixed.py
      token = responseData.data.token;
      user = responseData.data.user;
    } else if (responseData.token) {
      // Old format or direct response
      token = responseData.token;
      user = responseData.user;
    } else {
      throw new Error('Invalid response: Missing authentication token');
    }

    // Store token securely
    localStorage.setItem('auth_token', token);
    
    // Return consistent format
    return {
      user: user,
      token: token,
      message: responseData.message || 'Login successful'
    };
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Please check your connection');
      }
      throw error;
    }
    throw new Error('Login failed: Unable to connect to server');
  }
}

// Enhanced signup with better error handling
export const signup = async (signupData: any): Promise<{ message: string }> => {
  try {
    console.log('Starting signup request with data:', { ...signupData, password: '[REDACTED]' });
    
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupData),
      signal: ApiResponseHandler.createTimeoutSignal(30000),
    });

    console.log('Signup response status:', response.status);
    console.log('Signup response headers:', response.headers);
    
    const data = await ApiResponseHandler.handleResponse<{ message: string }>(response);
    console.log('Signup response data:', data);
    return data;
    
  } catch (error) {
    console.error('Signup error details:', error);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Please check your connection');
      }
      throw error;
    }
    throw new Error('Signup failed: Unable to connect to server');
  }
};

// Enhanced logout with cleanup
export const logout = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: ApiResponseHandler.createTimeoutSignal(10000),
      }).catch(() => {
        // Ignore logout errors for cleanup
      });
    }

    localStorage.removeItem('auth_token');
  } catch (error) {
    // Always clear token on logout attempt
    localStorage.removeItem('auth_token');
  }
};

// Enhanced token verification
export const verifyToken = async (): Promise<any | null> => {
  try {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: ApiResponseHandler.createTimeoutSignal(10000),
    });

    const responseData = await ApiResponseHandler.handleResponse<any>(response);
    
    // Handle both old and new response formats
    if (responseData.data && responseData.data.user) {
      // New format from auth_routes_fixed.py
      return responseData.data.user;
    } else if (responseData.user) {
      // Old format or direct response
      return responseData.user;
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error) {
    localStorage.removeItem('auth_token');
    return null;
  }
};
