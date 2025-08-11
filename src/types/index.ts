export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'admin' | 'finance' | 'branch' | 'auditor';
  department: string;
  branchLocation: string;
  location?: string; // optional location property
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  floatId: string;
  location: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  currency: string;
  exchangeRate?: number;
  receipt?: string;
  policyViolation?: boolean;
  violationReason?: string;
  submittedBy?: number;
  approvedBy?: number;
}

export interface Float {
  id: string;
  description: string;
  location: string;
  initialAmount: number;
  usedAmount: number;
  balance: number;
  status: 'active' | 'low' | 'exhausted';
  currency: string;
  createdBy: number;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  amountLimit?: number;
  category?: string;
  location?: string;
}

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
  department: string;
  branchLocation: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
  status?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
}

export type UserRole = 'admin' | 'finance' | 'branch' | 'auditor';

export interface RoleConfig {
  value: UserRole;
  label: string;
  color: string;
  permissions: string[];
}

export const ROLE_CONFIGS: RoleConfig[] = [
  {
    value: 'admin',
    label: 'System Administrator',
    color: 'destructive',
    permissions: ['all']
  },
  {
    value: 'finance',
    label: 'Finance Manager',
    color: 'primary',
    permissions: ['finance', 'reports', 'budgets']
  },
  {
    value: 'branch',
    label: 'Branch Officer',
    color: 'success',
    permissions: ['branch', 'transactions', 'inventory']
  },
  {
    value: 'auditor',
    label: 'Auditor',
    color: 'warning',
    permissions: ['audit', 'reports', 'compliance']
  }
];

export const DEPARTMENTS = [
  'Finance',
  'Operations',
  'Sales',
  'Marketing',
  'Human Resources',
  'IT Support',
  'Audit & Compliance'
] as const;

export const BRANCH_LOCATIONS = [
  'Nairobi Central',
  'Westlands',
  'Eastleigh',
  'Mombasa',
  'Kisumu',
  'Nakuru',
  'Eldoret',
  'Thika'
] as const;

export type Department = typeof DEPARTMENTS[number];
export type BranchLocation = typeof BRANCH_LOCATIONS[number];
