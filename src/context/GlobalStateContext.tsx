// Error Handling and Loading State System
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '../hooks/use-toast'; 
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Error types
export type ErrorType = 'network' | 'validation' | 'permission' | 'server' | 'unknown';

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible?: boolean;
}

// Loading state types
export interface LoadingState {
  id: string;
  message: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
}

// Global state interface
interface GlobalStateContextType {
  errors: AppError[];
  loadingStates: LoadingState[];
  isOnline: boolean;
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => string;
  removeError: (id: string) => void;
  clearErrors: () => void;
  addLoadingState: (state: Omit<LoadingState, 'id'>) => string;
  updateLoadingState: (id: string, updates: Partial<LoadingState>) => void;
  removeLoadingState: (id: string) => void;
  clearLoadingStates: () => void;
}

// Context creation
const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

// Provider component
export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Error management
  const addError = useCallback((errorData: Omit<AppError, 'id' | 'timestamp'>) => {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const error: AppError = {
      ...errorData,
      id,
      timestamp: new Date(),
      dismissible: errorData.dismissible ?? true,
    };

    setErrors(prev => [error, ...prev.slice(0, 4)]); // Keep only 5 errors max

    // Auto-dismiss after 10 seconds for non-critical errors
    if (error.dismissible && error.type !== 'permission' && error.type !== 'server') {
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e.id !== id));
      }, 10000);
    }

    return id;
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Loading state management
  const addLoadingState = useCallback((stateData: Omit<LoadingState, 'id'>) => {
    const id = `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const loadingState: LoadingState = { ...stateData, id };

    setLoadingStates(prev => [...prev, loadingState]);
    return id;
  }, []);

  const updateLoadingState = useCallback((id: string, updates: Partial<LoadingState>) => {
    setLoadingStates(prev => 
      prev.map(state => state.id === id ? { ...state, ...updates } : state)
    );
  }, []);

  const removeLoadingState = useCallback((id: string) => {
    setLoadingStates(prev => prev.filter(state => state.id !== id));
  }, []);

  const clearLoadingStates = useCallback(() => {
    setLoadingStates([]);
  }, []);

  return (
    <GlobalStateContext.Provider value={{
      errors,
      loadingStates,
      isOnline,
      addError,
      removeError,
      clearErrors,
      addLoadingState,
      updateLoadingState,
      removeLoadingState,
      clearLoadingStates,
    }}>
      {children}
      <GlobalErrorDisplay />
      <GlobalLoadingDisplay />
      <ConnectionStatus />
    </GlobalStateContext.Provider>
  );
};

// Hook to use global state
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }
  return context;
};

// Error display component
const GlobalErrorDisplay: React.FC = () => {
  const { errors, removeError } = useGlobalState();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error) => (
        <Alert
          key={error.id}
          variant={error.type === 'server' ? 'destructive' : 'default'}
          className="shadow-lg border"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="pr-8">
            <div className="font-medium">{error.message}</div>
            {error.details && (
              <div className="text-sm text-muted-foreground mt-1">
                {error.details}
              </div>
            )}
            {error.action && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={error.action.handler}
              >
                {error.action.label}
              </Button>
            )}
          </AlertDescription>
          {error.dismissible && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0"
              onClick={() => removeError(error.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </Alert>
      ))}
    </div>
  );
};

// Loading display component
const GlobalLoadingDisplay: React.FC = () => {
  const { loadingStates } = useGlobalState();

  if (loadingStates.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {loadingStates.map((state) => (
        <div
          key={state.id}
          className="bg-background border rounded-lg p-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{state.message}</span>
            {state.cancellable && state.onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={state.onCancel}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {typeof state.progress === 'number' && (
            <div className="space-y-1">
              <Progress value={state.progress} className="h-2" />
              <div className="text-xs text-muted-foreground text-right">
                {Math.round(state.progress)}%
              </div>
            </div>
          )}
          {typeof state.progress === 'undefined' && (
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Connection status component
const ConnectionStatus: React.FC = () => {
  const { isOnline } = useGlobalState();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground p-2 z-50">
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">
          No internet connection. Some features may not work.
        </span>
      </div>
    </div>
  );
};

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to monitoring service
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // You can also log to external error reporting service
    // errorReportingService.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error!}
          retry={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="max-w-md w-full text-center space-y-4">
      <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        An unexpected error occurred. Please try refreshing the page.
      </p>
      <div className="space-y-2">
        <Button onClick={retry} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="w-full"
        >
          Refresh Page
        </Button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="text-left">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Error Details (Development)
          </summary>
          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  </div>
);

// Utility functions for error handling
export const createNetworkError = (message: string, retry?: () => void): Omit<AppError, 'id' | 'timestamp'> => ({
  type: 'network',
  message: 'Network Error',
  details: message,
  action: retry ? { label: 'Retry', handler: retry } : undefined,
});

export const createValidationError = (message: string): Omit<AppError, 'id' | 'timestamp'> => ({
  type: 'validation',
  message: 'Validation Error',
  details: message,
});

export const createPermissionError = (message: string): Omit<AppError, 'id' | 'timestamp'> => ({
  type: 'permission',
  message: 'Permission Denied',
  details: message,
  dismissible: false,
});

export const createServerError = (message: string): Omit<AppError, 'id' | 'timestamp'> => ({
  type: 'server',
  message: 'Server Error',
  details: message,
  dismissible: false,
});

// Hook for managing component-level errors
export const useErrorHandler = () => {
  const { addError } = useGlobalState();

  const handleError = useCallback((error: any, context?: string) => {
    let errorData: Omit<AppError, 'id' | 'timestamp'>;

    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorData = createNetworkError(error.message);
      } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        errorData = createPermissionError(error.message);
      } else if (error.message.includes('validation')) {
        errorData = createValidationError(error.message);
      } else {
        errorData = createServerError(error.message);
      }
    } else if (typeof error === 'string') {
      errorData = {
        type: 'unknown',
        message: 'Error',
        details: context ? `${context}: ${error}` : error,
      };
    } else {
      errorData = {
        type: 'unknown',
        message: 'Unknown Error',
        details: context || 'An unexpected error occurred',
      };
    }

    return addError(errorData);
  }, [addError]);

  return { handleError };
};

// Hook for managing loading states
export const useLoadingState = (initialMessage?: string) => {
  const { addLoadingState, updateLoadingState, removeLoadingState } = useGlobalState();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const startLoading = useCallback((message: string, options?: {
    progress?: number;
    cancellable?: boolean;
    onCancel?: () => void;
  }) => {
    const id = addLoadingState({
      message,
      ...options,
    });
    setLoadingId(id);
    return id;
  }, [addLoadingState]);

  const updateLoading = useCallback((updates: Partial<LoadingState>) => {
    if (loadingId) {
      updateLoadingState(loadingId, updates);
    }
  }, [loadingId, updateLoadingState]);

  const stopLoading = useCallback(() => {
    if (loadingId) {
      removeLoadingState(loadingId);
      setLoadingId(null);
    }
  }, [loadingId, removeLoadingState]);

  // Auto-start loading if initial message provided
  React.useEffect(() => {
    if (initialMessage && !loadingId) {
      startLoading(initialMessage);
    }

    return () => {
      if (loadingId) {
        removeLoadingState(loadingId);
      }
    };
  }, [initialMessage, loadingId, startLoading, removeLoadingState]);

  return {
    isLoading: !!loadingId,
    startLoading,
    updateLoading,
    stopLoading,
  };
};