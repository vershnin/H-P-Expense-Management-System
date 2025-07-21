import axios from 'axios';

const API_URL = 'http://localhost:8080/api/auth';

interface LoginData {
  email: string;
  password: string;
}

interface User {
  id: number;
  email: string;
  role: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface VerifyResponse {
  user: User;
}

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${API_URL}/login`, data);
  return response.data;
};

export const verifyToken = async (token: string): Promise<User> => {
  // Add type parameter to axios.get
  const response = await axios.get<VerifyResponse>(`${API_URL}/verify`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data.user; // Now TypeScript knows response.data has a user property
};