import { useCallback } from 'react';
import { useGlobalState } from '../context/GlobalStateContext';
import type { AppError, ErrorType } from '../context/GlobalStateContext';
import {
  createNetworkError,
  createValidationError,
  createPermissionError,
  createServerError
} from '../context/GlobalStateContext';

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

// Re-export types for convenience
export type { AppError, ErrorType } from '../context/GlobalStateContext';