// @ts-nocheck
import { useState, useCallback, useRef } from 'react';
import { toast } from './useToast';

/** Options for the useMutation hook */
export interface UseMutationOptions<TData, TVariables> {
  /** Callback fired on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Callback fired on mutation error */
  onError?: (error: Error, variables: TVariables) => void;
  /** Query keys to invalidate on success (dispatches CustomEvent) */
  invalidateQueries?: string[];
  /** Toast message on success (set to false to disable) */
  successMessage?: string | false;
  /** Toast message on error (set to false to disable) */
  errorMessage?: string | false;
  /** Whether to show a loading toast */
  showLoadingToast?: boolean;
  /** Loading toast message */
  loadingMessage?: string;
}

/** Return type for the useMutation hook */
export interface UseMutationReturn<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData | null>;
  /** Whether the mutation is in progress */
  isLoading: boolean;
  /** Error if the mutation failed */
  error: Error | null;
  /** Data returned from the successful mutation */
  data: TData | null;
  /** Reset mutation state */
  reset: () => void;
  /** Number of times this mutation has been executed */
  mutationCount: number;
}

/**
 * Custom hook for API mutations with optimistic updates support.
 *
 * Features:
 * - Loading state management
 * - Error handling with toast notifications
n * - Auto-invalidates queries on success (via CustomEvent dispatch)
 * - Success/error callbacks
 * - Loading toast option
 * - Reset capability
 *
 * @param mutationFn - Async function that performs the mutation
 * @param options - Configuration options
 * @returns {UseMutationReturn<TData, TVariables>} Mutation state and controls
 *
 * @example
 * ```tsx
 * const { mutate, isLoading, error, data } = useMutation(
 *   async (vars: { id: string; name: string }) => {
 *     return api.put(`/campaigns/${vars.id}`, { name: vars.name });
 *   },
 *   {
 *     onSuccess: (data) => console.log('Updated:', data),
 *     onError: (err) => console.error('Failed:', err),
 *     invalidateQueries: ['campaigns'],
 *     successMessage: 'Campaign updated successfully',
 *     errorMessage: 'Failed to update campaign',
 *   }
 * );
 * ```
 */
export function useMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationReturn<TData, TVariables> {
  const {
    onSuccess,
    onError,
    invalidateQueries = [],
    successMessage = false,
    errorMessage,
    showLoadingToast = false,
    loadingMessage = 'Processing...',
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<TData | null>(null);
  const [mutationCount, setMutationCount] = useState(0);
  const loadingToastIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
    if (loadingToastIdRef.current) {
      toast.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      setIsLoading(true);
      setError(null);
      setMutationCount((prev) => prev + 1);

      // Show loading toast if requested
      if (showLoadingToast) {
        loadingToastIdRef.current = toast.info(loadingMessage, undefined, { duration: 30000 });
      }

      try {
        const result = await mutationFn(variables);
        setData(result);
        setIsLoading(false);

        // Dismiss loading toast
        if (loadingToastIdRef.current) {
          toast.dismiss(loadingToastIdRef.current);
          loadingToastIdRef.current = null;
        }

        // Show success toast
        if (successMessage !== false && successMessage) {
          toast.success(successMessage);
        }

        // Invalidate queries
        invalidateQueries.forEach((queryKey) => {
          window.dispatchEvent(new CustomEvent(`invalidate:${queryKey}`, { detail: result }));
        });

        // Call success callback
        onSuccess?.(result, variables);

        return result;
      } catch (err) {
        const mutationError = err instanceof Error ? err : new Error(String(err));
        setError(mutationError);
        setIsLoading(false);

        // Dismiss loading toast
        if (loadingToastIdRef.current) {
          toast.dismiss(loadingToastIdRef.current);
          loadingToastIdRef.current = null;
        }

        // Show error toast
        const defaultErrorMsg = mutationError.message || 'An error occurred';
        if (errorMessage !== false) {
          toast.error(errorMessage || 'Error', defaultErrorMsg);
        }

        // Call error callback
        onError?.(mutationError, variables);

        return null;
      }
    },
    [mutationFn, onSuccess, onError, invalidateQueries, successMessage, errorMessage, showLoadingToast, loadingMessage]
  );

  return {
    mutate,
    isLoading,
    error,
    data,
    reset,
    mutationCount,
  };
}

/**
 * Convenience hook for simple API mutations that just call a DELETE endpoint.
 *
 * @example
 * ```tsx
 * const { mutate: deleteCampaign, isLoading } = useDeleteMutation(
 *   (id: string) => api.delete(`/campaigns/${id}`),
 *   { invalidateQueries: ['campaigns'], successMessage: 'Campaign deleted' }
 * );
 * ```
 */
export function useDeleteMutation<TId extends string | number>(
  deleteFn: (id: TId) => Promise<unknown>,
  options?: Omit<UseMutationOptions<unknown, TId>, 'successMessage'> & { successMessage?: string }
): UseMutationReturn<unknown, TId> {
  return useMutation<unknown, TId>(
    async (id: TId) => {
      await deleteFn(id);
      return { deleted: true, id };
    },
    {
      ...options,
      successMessage: options?.successMessage ?? 'Deleted successfully',
    }
  );
}

/**
 * Convenience hook for API mutations that call a POST endpoint.
 *
 * @example
 * ```tsx
 * const { mutate: createItem, isLoading } = useCreateMutation(
 *   (data: CreateInput) => api.post('/items', data),
 *   { invalidateQueries: ['items'], successMessage: 'Item created' }
 * );
 * ```
 */
export function useCreateMutation<TData, TVariables>(
  createFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TVariables>, 'successMessage'> & { successMessage?: string }
): UseMutationReturn<TData, TVariables> {
  return useMutation<TData, TVariables>(createFn, {
    ...options,
    successMessage: options?.successMessage ?? 'Created successfully',
  });
}

/**
 * Convenience hook for API mutations that call a PUT/PATCH endpoint.
 *
 * @example
 * ```tsx
 * const { mutate: updateItem, isLoading } = useUpdateMutation(
 *   (vars: { id: string; data: UpdateInput }) => api.put(`/items/${vars.id}`, vars.data),
 *   { invalidateQueries: ['items'], successMessage: 'Item updated' }
 * );
 * ```
 */
export function useUpdateMutation<TData, TVariables>(
  updateFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TVariables>, 'successMessage'> & { successMessage?: string }
): UseMutationReturn<TData, TVariables> {
  return useMutation<TData, TVariables>(updateFn, {
    ...options,
    successMessage: options?.successMessage ?? 'Updated successfully',
  });
}

export default useMutation;
