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
  submittedBy?: string;
  approvedBy?: string;
}