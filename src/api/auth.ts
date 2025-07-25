const API_BASE_URL = 'http://localhost:5000/api';

export interface LoginCredentials {
  email: string;
  password: string;
  role: string;
}

export interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  branch: string;
  employeeId: string;
}

export interface User {
  name: string;
  permissions: any[];
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  employeeId: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: any;
}

// Utility function to handle API responses
const handleApiResponse = async (response: Response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  return data;
};

// Utility function to make authenticated requests
const makeAuthenticatedRequest = async (
  url: string, 
  options: RequestInit = {},
  token?: string
) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Try to get token from localStorage
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return handleApiResponse(response);
};


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

/**
 * Login function - Integrates with Flask backend
 */

export const login = async (email: string, password: string, role: string): Promise<AuthResponse> => {
  // Client-side validation
  if (!email || !password || !role) {
    throw new Error("All fields are required");
  }

  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await handleApiResponse(response);

    // Store tokens in localStorage
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data;
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Login failed. Please try again.');
  }
};

/**
 * Sign up function - Integrates with Flask backend
 */
export const signup = async (signUpData: SignUpData): Promise<AuthResponse> => {
  // Client-side validation
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    role,
    branch,
    employeeId
  } = signUpData;

  if (!firstName?.trim()) {
    throw new Error("First name is required");
  }

  if (!lastName?.trim()) {
    throw new Error("Last name is required");
  }

  if (!email?.trim()) {
    throw new Error("Email is required");
  }

  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address");
  }

  if (!phone?.trim()) {
    throw new Error("Phone number is required");
  }

  if (!isValidKenyanPhone(phone)) {
    throw new Error("Please enter a valid Kenyan phone number");
  }

  if (!password) {
    throw new Error("Password is required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (!role) {
    throw new Error("Role is required");
  }

  if (!branch) {
    throw new Error("Branch is required");
  }

  if (!employeeId?.trim()) {
    throw new Error("Employee ID is required");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password,
        role,
        branch,
        employee_id: employeeId.trim()
      }),
    });

    const data = await handleApiResponse(response);
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Sign up failed. Please try again.');
  }
};

/**
 * Refresh token function
 */
export const refreshAuthToken = async (refreshToken: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    const data = await handleApiResponse(response);

    // Update stored tokens
    if (data.token) {
      localStorage.setItem('authToken', data.token);
    }
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data;
  } catch (error) {
    // Clear invalid tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Token refresh failed. Please login again.');
  }
};

/**
 * Logout function
 */
export const logout = async (token: string): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (error) {
    // Even if server logout fails, clear local storage
    console.warn('Server logout failed:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  }
};

/**
 * Get current user from token
 */
export const getCurrentUser = async (token: string): Promise<User> => {
  try {
    const data = await makeAuthenticatedRequest(`${API_BASE_URL}/me`, {
      method: 'GET',
    }, token);

    return data.user;
  } catch (error) {
    // Clear invalid tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get user information');
  }
};

/**
 * Reset password function
 */
export const resetPassword = async (email: string): Promise<void> => {
  if (!email || !isValidEmail(email)) {
    throw new Error("Please enter a valid email address");
  }

  try {
    await makeAuthenticatedRequest(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Password reset failed. Please try again.');
  }
};

/**
 * Change password function
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  token: string
): Promise<void> => {
  if (!currentPassword || !newPassword) {
    throw new Error("Both current and new passwords are required");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters long");
  }

  try {
    await makeAuthenticatedRequest(`${API_BASE_URL}/change-password`, {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      }),
    }, token);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Password change failed. Please try again.');
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  updates: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>,
  token: string
): Promise<User> => {
  // Validate updates
  if (updates.firstName !== undefined && !updates.firstName.trim()) {
    throw new Error("First name cannot be empty");
  }

  if (updates.lastName !== undefined && !updates.lastName.trim()) {
    throw new Error("Last name cannot be empty");
  }

  if (updates.phone !== undefined && !isValidKenyanPhone(updates.phone)) {
    throw new Error("Please enter a valid Kenyan phone number");
  }

  try {
    const data = await makeAuthenticatedRequest(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        first_name: updates.firstName?.trim(),
        last_name: updates.lastName?.trim(),
        phone: updates.phone?.trim()
      }),
    }, token);

    return data.user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Profile update failed. Please try again.');
  }
};

// Test database connection
 
export const testDbConnection = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/test`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Test DB connection failed');
    }
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Database connection test failed');
  }
};

/**
 * Verify token validity
 */
export const verifyToken = async (token: string): Promise<boolean> => {
  try {
    await makeAuthenticatedRequest(`${API_BASE_URL}/verify-token`, {
      method: 'GET',
    }, token);
    return true;
  } catch (error) {
    return false;
  }
};

// Get all users (admin only)
 
export const getAllUsers = async (token: string): Promise<User[]> => {
  try {
    const data = await makeAuthenticatedRequest(`${API_BASE_URL}/users`, {
      method: 'GET',
    }, token);
    return data.users;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch users');
  }
};

//Create user (admin only)

export const createUser = async (userData: SignUpData, token: string): Promise<User> => {
  try {
    const data = await makeAuthenticatedRequest(`${API_BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify({
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: userData.role,
        branch: userData.branch,
        employee_id: userData.employeeId
      }),
    }, token);
    return data.user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create user');
  }
};

// Update user status (admin only)

export const updateUserStatus = async (
  userId: string, 
  isActive: boolean, 
  token: string
): Promise<User> => {
  try {
    const data = await makeAuthenticatedRequest(`${API_BASE_URL}/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive }),
    }, token);
    return data.user;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to update user status');
  }
};