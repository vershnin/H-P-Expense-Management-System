// React Hooks for Better State Management and API Integration
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, ApiResponse } from '../api/api.service';
import { User, Expense, Float } from '../types';

// Generic API hook with loading states and error handling
export function useApiCall<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const cancelRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<ApiResponse<T>>) => {
    // Cancel previous request if still pending
    if (cancelRef.current) {
      cancelRef.current.abort();
    }

    cancelRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Unknown error occurred');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelRef.current) {
        cancelRef.current.abort();
      }
    };
  }, []);

  return { loading, error, data, execute, reset };
}

// Hook for managing floats with real-time updates
export function useFloats(filters?: {
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const [floats, setFloats] = useState<Float[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchFloats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getFloats(filters);
      
      if (response.success && response.data) {
        setFloats(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.message || 'Failed to fetch floats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createFloat = useCallback(async (floatData: Omit<Float, 'id' | 'balance' | 'createdBy'>) => {
    try {
      const response = await apiService.createFloat(floatData);
      
      if (response.success && response.data) {
        setFloats(prev => [...prev, response.data!]);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create float');
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const updateFloat = useCallback(async (id: string, updates: Partial<Float>) => {
    try {
      const response = await apiService.updateFloat(id, updates);
      
      if (response.success && response.data) {
        setFloats(prev => prev.map(float => 
          float.id === id ? response.data! : float
        ));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update float');
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteFloat = useCallback(async (id: string) => {
    try {
      const response = await apiService.deleteFloat(id);
      
      if (response.success) {
        setFloats(prev => prev.filter(float => float.id !== id));
      } else {
        throw new Error(response.message || 'Failed to delete float');
      }
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchFloats();
  }, [fetchFloats]);

  return {
    floats,
    loading,
    error,
    pagination,
    createFloat,
    updateFloat,
    deleteFloat,
    refetch: fetchFloats,
  };
}

// Hook for managing expenses with advanced filtering
export function useExpenses(filters?: {
  status?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getExpenses(filters);
      
      if (response.success && response.data) {
        setExpenses(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.message || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'submittedBy'>) => {
    try {
      const response = await apiService.createExpense(expenseData);
      
      if (response.success && response.data) {
        setExpenses(prev => [response.data!, ...prev]);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create expense');
      }
    } catch (err) {
      throw err;
    }
  }, []);

  const approveExpense = useCallback(async (
    id: string, 
    action: 'approve' | 'reject', 
    comments?: string
  ) => {
    try {
      const response = await apiService.approveExpense(id, action, comments);
      
      if (response.success && response.data) {
        setExpenses(prev => prev.map(expense => 
          expense.id === id ? response.data! : expense
        ));
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to process approval');
      }
    } catch (err) {
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    loading,
    error,
    pagination,
    createExpense,
    approveExpense,
    refetch: fetchExpenses,
  };
}

// Hook for dashboard statistics
export function useDashboardStats(filters?: {
  location?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [stats, setStats] = useState<{
    totalFloats: number;
    totalFloatValue: number;
    totalUsed: number;
    totalBalance: number;
    pendingApprovals: number;
    policyViolations: number;
    expensesByCategory: Record<string, number>;
    expensesByLocation: Record<string, number>;
    monthlyTrend: Array<{ month: string; amount: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getDashboardStats(filters);
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.message || 'Failed to fetch dashboard stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// Hook for file uploads with progress tracking
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    filename: string;
  } | null>(null);

  const uploadFile = useCallback(async (file: File, endpoint: string) => {
    setUploading(true);
    setError(null);
    setProgress(0);
    setUploadedFile(null);

    try {
      const response = await apiService.uploadFile(
        file,
        endpoint,
        (progressPercent) => setProgress(progressPercent)
      );

      if (response.success && response.data) {
        setUploadedFile(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    setUploadedFile(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadedFile,
    uploadFile,
    reset,
  };
}

// Hook for real-time notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }>>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const handleMessage = (data: any) => {
      if (data.type === 'notification') {
        const newNotification = {
          id: data.id || `notif_${Date.now()}`,
          type: data.notificationType || 'info',
          title: data.title,
          message: data.message,
          timestamp: new Date(data.timestamp),
          read: false,
        };

        setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
      }
    };

    apiService.connectWebSocket(handleMessage);
    setConnected(true);

    return () => {
      apiService.disconnectWebSocket();
      setConnected(false);
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    connected,
    unreadCount,
    markAsRead,
    clearAll,
  };
}

// Hook for permission checking
export function usePermissions(user: User | null) {
  const hasPermission = useCallback((action: string, resource?: string): boolean => {
    if (!user) return false;

    // Admin has all permissions
    if (user.role === 'admin') return true;

    // Define permission matrix
    const permissions: Record<string, string[]> = {
      admin: ['*'],
      finance: [
        'floats:read', 'floats:create', 'floats:update', 'floats:delete',
        'expenses:read', 'expenses:approve', 'expenses:reject',
        'reports:generate', 'dashboard:view'
      ],
      branch: [
        'expenses:read', 'expenses:create', 'expenses:approve', 'expenses:reject',
        'floats:read', 'dashboard:view'
      ],
      auditor: [
        'expenses:read', 'floats:read', 'reports:generate',
        'audit:view', 'dashboard:view'
      ],
    };

    const userPermissions = permissions[user.role] || [];
    
    // Check for wildcard permission
    if (userPermissions.includes('*')) return true;
    
    // Check for specific permission
    const permissionKey = resource ? `${resource}:${action}` : action;
    return userPermissions.includes(permissionKey);
  }, [user]);

  const canManageFloats = hasPermission('create', 'floats');
  const canApproveExpenses = hasPermission('approve', 'expenses');
  const canViewReports = hasPermission('generate', 'reports');
  const canViewAudit = hasPermission('view', 'audit');

  return {
    hasPermission,
    canManageFloats,
    canApproveExpenses,
    canViewReports,
    canViewAudit,
  };
}

// Hook for optimistic updates
export function useOptimisticUpdates<T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void
) {
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, T>>(new Map());

  const optimisticUpdate = useCallback(async (
    id: string,
    updates: Partial<T>,
    apiCall: () => Promise<T>
  ) => {
    const currentItem = items.find(item => item.id === id);
    if (!currentItem) return;

    const optimisticItem = { ...currentItem, ...updates };
    
    // Apply optimistic update
    setPendingUpdates(prev => new Map(prev).set(id, optimisticItem));
    setItems(items.map(item => 
      item.id === id ? optimisticItem : item
    ));

    try {
      const result = await apiCall();
      
      // Replace with server response
      setItems(items.map(item => 
        item.id === id ? result : item
      ));
    } catch (error) {
      // Revert optimistic update on error
      setItems(items.map(item => 
        item.id === id ? currentItem : item
      ));
      throw error;
    } finally {
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
  }, [items, setItems]);

  const isUpdating = useCallback((id: string) => {
    return pendingUpdates.has(id);
  }, [pendingUpdates]);

  return { optimisticUpdate, isUpdating };
}