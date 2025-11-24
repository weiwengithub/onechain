import { useQuery } from '@tanstack/react-query';

import { fetchTransactionById, fetchTransactionInfo } from '@/utils/tron';
import type { TronTransaction } from '@/types/tron/tx';
import type { TronTransactionInfo } from '@/types/tron/api';

import { useCurrentTronNetwork } from './useCurrentTronNetwork';

/**
 * Hook to fetch transaction by ID
 * @param txId - Transaction ID
 * @param enabled - Enable query
 * @returns Query result with transaction data
 */
export function useTxById(txId: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useQuery<TronTransaction | null, Error>({
    queryKey: ['tron', 'transaction', 'byId', txId, currentTronNetwork?.id],
    queryFn: async () => {
      if (!txId || !currentTronNetwork) {
        return null;
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchTransactionById(txId, rpcUrl);
    },
    enabled: enabled && !!txId && !!currentTronNetwork,
    staleTime: 60000, // Transaction data doesn't change once confirmed
    retry: 3,
  });
}

/**
 * Hook to fetch transaction info (receipt) by ID
 * @param txId - Transaction ID
 * @param enabled - Enable query
 * @returns Query result with transaction info
 */
export function useTxInfo(txId: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useQuery<TronTransactionInfo | null, Error>({
    queryKey: ['tron', 'transaction', 'info', txId, currentTronNetwork?.id],
    queryFn: async () => {
      if (!txId || !currentTronNetwork) {
        return null;
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchTransactionInfo(txId, rpcUrl);
    },
    enabled: enabled && !!txId && !!currentTronNetwork,
    staleTime: 60000,
    retry: 3,
  });
}

/**
 * Hook to poll for transaction confirmation
 * @param txId - Transaction ID
 * @param enabled - Enable query
 * @returns Query result with transaction info, refetches until confirmed
 */
export function useTxConfirmation(txId: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useQuery<TronTransactionInfo | null, Error>({
    queryKey: ['tron', 'transaction', 'confirmation', txId, currentTronNetwork?.id],
    queryFn: async () => {
      if (!txId || !currentTronNetwork) {
        return null;
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchTransactionInfo(txId, rpcUrl);
    },
    enabled: enabled && !!txId && !!currentTronNetwork,
    refetchInterval: (data) => {
      // Stop refetching once transaction is confirmed
      if (data && data.blockNumber) {
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
    retry: 20, // Retry up to 20 times (60 seconds total)
    retryDelay: 3000,
  });
}

/**
 * Hook to fetch both transaction and transaction info
 * @param txId - Transaction ID
 * @param enabled - Enable query
 * @returns Query result with combined transaction data
 */
export function useFullTxInfo(txId: string | undefined, enabled = true) {
  const txQuery = useTxById(txId, enabled);
  const txInfoQuery = useTxInfo(txId, enabled);

  return {
    transaction: txQuery.data,
    transactionInfo: txInfoQuery.data,
    isLoading: txQuery.isLoading || txInfoQuery.isLoading,
    isError: txQuery.isError || txInfoQuery.isError,
    error: txQuery.error || txInfoQuery.error,
    refetch: () => {
      txQuery.refetch();
      txInfoQuery.refetch();
    },
  };
}
