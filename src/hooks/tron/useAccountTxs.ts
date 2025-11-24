import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchTransactionHistory, fetchTrc20TransactionHistory } from '@/utils/tron';
import type { TronTransactionHistory } from '@/utils/tron/fetch/transactions';

import { useCurrentTronNetwork } from './useCurrentTronNetwork';

/**
 * Hook to fetch transaction history with infinite scroll support
 * @param address - TRON address (base58)
 * @param enabled - Enable query
 * @returns Infinite query result with transaction history
 */
export function useAccountTxs(address: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useInfiniteQuery<TronTransactionHistory, Error>({
    queryKey: ['tron', 'transactions', address, currentTronNetwork?.id],
    queryFn: async ({ pageParam }) => {
      if (!address || !currentTronNetwork) {
        throw new Error('Address or network not available');
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchTransactionHistory(address, rpcUrl, 20, pageParam as string | undefined);
    },
    enabled: enabled && !!address && !!currentTronNetwork,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.transactions[lastPage.transactions.length - 1]?.txID : undefined;
    },
    initialPageParam: undefined,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch TRC20 transaction history
 * @param address - TRON address (base58)
 * @param contractAddress - TRC20 contract address (base58)
 * @param enabled - Enable query
 * @returns Infinite query result with TRC20 transaction history
 */
export function useTrc20AccountTxs(address: string | undefined, contractAddress: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useInfiniteQuery<TronTransactionHistory, Error>({
    queryKey: ['tron', 'transactions', 'trc20', address, contractAddress, currentTronNetwork?.id],
    queryFn: async ({ pageParam }) => {
      if (!address || !contractAddress || !currentTronNetwork) {
        throw new Error('Address, contract address, or network not available');
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchTrc20TransactionHistory(address, contractAddress, rpcUrl, 20, pageParam as string | undefined);
    },
    enabled: enabled && !!address && !!contractAddress && !!currentTronNetwork,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.transactions[lastPage.transactions.length - 1]?.txID : undefined;
    },
    initialPageParam: undefined,
    staleTime: 30000,
  });
}
