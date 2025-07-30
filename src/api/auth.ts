const API_BASE_URL = 'http://localhost:5000/api';

export interface LoginRequest {
  email: string;
  password: string;
  role: string; // "admin", "finance", "branch", or "auditor"
}

export interface SignUpRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string; // "admin", "finance", "branch", or "auditor"
  department: string;
  branchLocation: string;
}

export interface User {
  name: string;
  permissions: any[];
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "admin" | "finance" | "branch" | "auditor";
  department: string;
  branchLocation: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface ApiError {
  message: string;
  error: string;
  status: number;
}

// Utility function to handle API responses
export async function login(email: string, password: string, role: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        role
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store token if needed
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    
    return data; // This should contain { user: {...}, token: "...", message: "..." }
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
}

// Sign up function
export const signup = async (signupData: SignUpRequest): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Sign up failed');
    }

    return { message: data.message };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('authToken');

    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
    });
    }

    // Clear localStorage
    localStorage.removeItem('authToken');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Logout failed');
  }
};

// Verify token function
export const verifyToken = async (): Promise<User | null> => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      return null;
    }
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      localStorage.removeItem('authToken');
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    localStorage.removeItem('authToken');
    return null;
  }
};

// Password reset function
export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Password reset request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
};

// Reset password function
export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Password reset failed');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

 // Validate Hotpoint email format (username@hotpoint.co.ke)
 
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@hotpoint\.co\.ke$/;
  return emailRegex.test(email);
};
// Validate Kenyan phone number
const isValidKenyanPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+254|0)[17]\d{8}$/;
  return phoneRegex.test(phone);
};
// Validate password strength
const isValidPassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one lowercase, one number, and one special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}