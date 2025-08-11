import { User, Expense, Float, Policy, AuthResponse, ApiError } from '../types';

// API Response wrapper interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
}

class ApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private retryConfig = { attempts: 3, delay: 1000 };

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  }

  // Enhanced request method with retry logic and caching
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheConfig?: CacheConfig
  ): Promise<ApiResponse<T>> {
    // Check cache first
    if (cacheConfig && options.method === 'GET') {
      const cached = this.getFromCache(cacheConfig.key);
      if (cached) {
        return cached;
      }
    }

    const token = localStorage.getItem('auth_token');
    const headers = new Headers({
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0',
      'X-Request-ID': this.generateRequestId(),
      ...options.headers,
    });

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let lastError: Error;
    
    for (let attempt = 0; attempt < this.retryConfig.attempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
        });

        const data: ApiResponse<T> = await response.json();

        // Handle different response statuses
        if (response.status === 401) {
          this.handleUnauthorized();
          throw new Error('Authentication required');
        }

        if (!response.ok) {
          throw new Error(data.message || `HTTP ${response.status}`);
        }

        // Cache successful GET requests
        if (cacheConfig && options.method === 'GET' && data.success) {
          this.setCache(cacheConfig.key, data, cacheConfig.ttl);
        }

        return data;

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry for certain errors
        if (error instanceof TypeError || 
            (error as any)?.status === 400 || 
            (error as any)?.status === 401) {
          break;
        }

        // Wait before retry
        if (attempt < this.retryConfig.attempts - 1) {
          await this.delay(this.retryConfig.delay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  // Cache management
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleUnauthorized(): void {
    localStorage.removeItem('auth_token');
    // Dispatch custom event for auth state change
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  // Authentication endpoints
  async login(email: string, password: string, role: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });

    if (response.success && response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
    }

    return response.data!;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
      this.clearCache();
    }
  }

  async verifyToken(): Promise<User | null> {
    try {
      const response = await this.request<{ user: User }>('/auth/verify');
      return response.success ? response.data!.user : null;
    } catch {
      return null;
    }
  }

  // Float management endpoints
  async getFloats(filters?: {
    location?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Float[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/floats${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<Float[]>(endpoint, {}, {
      key: `floats_${queryParams.toString()}`,
      ttl: 5 * 60 * 1000, // 5 minutes
    });
  }

  async createFloat(floatData: Omit<Float, 'id' | 'balance' | 'createdBy'>): Promise<ApiResponse<Float>> {
    const response = await this.request<Float>('/floats', {
      method: 'POST',
      body: JSON.stringify(floatData),
    });

    // Invalidate floats cache
    this.cache.forEach((_, key) => {
      if (key.startsWith('floats_')) {
        this.cache.delete(key);
      }
    });

    return response;
  }

  async updateFloat(id: string, updates: Partial<Float>): Promise<ApiResponse<Float>> {
    const response = await this.request<Float>(`/floats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    // Invalidate related caches
    this.cache.forEach((_, key) => {
      if (key.startsWith('floats_') || key === `float_${id}`) {
        this.cache.delete(key);
      }
    });

    return response;
  }

  async deleteFloat(id: string): Promise<ApiResponse<void>> {
    const response = await this.request<void>(`/floats/${id}`, {
      method: 'DELETE',
    });

    // Invalidate related caches
    this.cache.forEach((_, key) => {
      if (key.startsWith('floats_') || key === `float_${id}`) {
        this.cache.delete(key);
      }
    });

    return response;
  }

  // Expense management endpoints
  async getExpenses(filters?: {
    status?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Expense[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/expenses${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<Expense[]>(endpoint, {}, {
      key: `expenses_${queryParams.toString()}`,
      ttl: 2 * 60 * 1000, // 2 minutes
    });
  }

  async createExpense(expenseData: Omit<Expense, 'id' | 'submittedBy'>): Promise<ApiResponse<Expense>> {
    const response = await this.request<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });

    // Invalidate expenses cache
    this.cache.forEach((_, key) => {
      if (key.startsWith('expenses_')) {
        this.cache.delete(key);
      }
    });

    return response;
  }

  async approveExpense(
    id: string, 
    action: 'approve' | 'reject', 
    comments?: string
  ): Promise<ApiResponse<Expense>> {
    const response = await this.request<Expense>(`/expenses/approve/${id}`, {
      method: 'POST',
      body: JSON.stringify({ action, comments }),
    });

    // Invalidate related caches
    this.cache.forEach((_, key) => {
      if (key.startsWith('expenses_')) {
        this.cache.delete(key);
      }
    });

    return response;
  }

  // File upload with progress tracking
  async uploadFile(
    file: File,
    endpoint: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ url: string; filename: string }>> {
    const token = localStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));

      xhr.open('POST', `${this.baseUrl}${endpoint}`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }

  // Dashboard statistics
  async getDashboardStats(filters?: {
    location?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<{
    totalFloats: number;
    totalFloatValue: number;
    totalUsed: number;
    totalBalance: number;
    pendingApprovals: number;
    policyViolations: number;
    expensesByCategory: Record<string, number>;
    expensesByLocation: Record<string, number>;
    monthlyTrend: Array<{ month: string; amount: number }>;
  }>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const endpoint = `/dashboard/stats${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request(endpoint, {}, {
      key: `dashboard_stats_${queryParams.toString()}`,
      ttl: 5 * 60 * 1000, // 5 minutes
    });
  }

  // Reports and analytics
  async generateReport(
    type: 'expenses' | 'floats' | 'audit',
    filters?: Record<string, any>,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<ApiResponse<any>> {
    return this.request(`/reports/${type}`, {
      method: 'POST',
      body: JSON.stringify({ filters, format }),
    });
  }

  // Policies management
  async getPolicies(): Promise<ApiResponse<Policy[]>> {
    return this.request<Policy[]>('/policies', {}, {
      key: 'policies',
      ttl: 10 * 60 * 1000, // 10 minutes
    });
  }

  // Real-time notifications (WebSocket integration)
  private ws: WebSocket | null = null;

  connectWebSocket(onMessage: (data: any) => void): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    const wsUrl = this.baseUrl.replace('http', 'ws').replace('/api', '/ws');
    
    this.ws = new WebSocket(`${wsUrl}?token=${token}`);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(onMessage), 5000);
    };
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for use in components
export type { ApiResponse };