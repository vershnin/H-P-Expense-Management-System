import { useErrorHandler, useLoadingState } from '../context/GlobalStateContext';

export const useApi = () => {
  const { handleError } = useErrorHandler();
  const { startLoading, stopLoading } = useLoadingState();

  const callApi = async <T,>(apiCall: () => Promise<T>, loadingMessage = 'Loading...') => {
    const loadingId = startLoading(loadingMessage);
    
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      stopLoading();
    }
  };

  return { callApi };
};