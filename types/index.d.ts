// src/types/authTypes.ts
export interface User {
  id: number;
  email: string;
  name: string;
  role?: string;  // Optional property
  // Add other user properties as needed
}

export interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}