import { useCallback, useEffect, useRef, useState } from 'react';
import { recordClientTechnicalError } from '../services/errorHandling';

// The gesture reloads data only; writes/synchronization remain explicit actions.
export function usePullToRefresh(load, { disabled = false, onError } = {}) {
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const onRefresh = useCallback(async () => {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try { await load(); }
    catch (error) {
      recordClientTechnicalError({ code: 'PULL_REFRESH_FAILED', detail: error?.message });
      onError?.(error);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [disabled, load, onError]);
  return { refreshing, onRefresh };
}
