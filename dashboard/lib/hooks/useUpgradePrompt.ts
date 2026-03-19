import { useState, useCallback } from 'react';

interface UpgradePromptState {
  open: boolean;
  resource: string;
  current: number;
  limit: number;
}

export function useUpgradePrompt() {
  const [state, setState] = useState<UpgradePromptState>({
    open: false,
    resource: '',
    current: 0,
    limit: 0,
  });

  const setOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  /**
   * Checks if an error is a 403 PLAN_LIMIT_REACHED response.
   * If so, auto-opens the upgrade prompt with the limit details.
   * Returns true if it was a plan limit error (so the caller can skip showing a generic error).
   */
  const checkLimit = useCallback((error: unknown): boolean => {
    const err = error as { response?: { status?: number; data?: { code?: string; resource?: string; current?: number; limit?: number } } };
    if (
      err?.response?.status === 403 &&
      err?.response?.data?.code === 'PLAN_LIMIT_REACHED'
    ) {
      const { resource, current, limit } = err.response.data;
      setState({
        open: true,
        resource: resource ?? '',
        current: current ?? 0,
        limit: limit ?? 0,
      });
      return true;
    }
    return false;
  }, []);

  return {
    open: state.open,
    setOpen,
    resource: state.resource,
    current: state.current,
    limit: state.limit,
    checkLimit,
  };
}
