import React from 'react';
import { useGlobalState } from '../context/GlobalStateContext';
import type { LoadingState } from '../context/GlobalStateContext';

export const useLoadingState = (initialMessage?: string) => {
  const { addLoadingState, updateLoadingState, removeLoadingState } = useGlobalState();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const startLoading = React.useCallback((message: string, options?: {
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

  const updateLoading = React.useCallback((updates: Partial<LoadingState>) => {
    if (loadingId) {
      updateLoadingState(loadingId, updates);
    }
  }, [loadingId, updateLoadingState]);

  const stopLoading = React.useCallback(() => {
    if (loadingId) {
      removeLoadingState(loadingId);
      setLoadingId(null);
    }
  }, [loadingId, removeLoadingState]);

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