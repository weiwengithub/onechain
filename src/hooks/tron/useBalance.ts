import { useQuery } from '@tanstack/react-query';

import { fetchTrxBalance, fetchTrc20Balance, fetchAccountResource } from '@/utils/tron';
import type { TronAccountBalance, TronAccountResource } from '@/types/tron/balance';

import { useCurrentTronNetwork } from './useCurrentTronNetwork';

/**
 * Hook to fetch TRX balance
 * @param address - TRON address (base58)
 * @param enabled - Enable query
 * @returns Query result with balance data
 */
export function useTrxBalance(address: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useQuery<TronAccountBalance, Error>({
    queryKey: ['tron', 'balance', 'trx', address, currentTronNetwork?.id],
    queryFn: async () => {
      if (!address || !currentTronNetwork) {
        throw new Error('Address or network not available');
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchTrxBalance(address, rpcUrl);
    },
    enabled: enabled && !!address && !!currentTronNetwork,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  });
}

/**
 * Hook to fetch TRC20 token balance
 * @param address - Owner address (base58)
 * @param contractAddress - Token contract address (base58)
 * @param enabled - Enable query
 * @returns Query result with token balance
 */
export function useTrc20Balance(address: string | undefined, contractAddress: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useQuery<string, Error>({
    queryKey: ['tron', 'balance', 'trc20', address, contractAddress, currentTronNetwork?.id],
    queryFn: async () => {
      if (!address || !contractAddress || !currentTronNetwork) {
        throw new Error('Address, contract address, or network not available');
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchTrc20Balance(address, contractAddress, rpcUrl);
    },
    enabled: enabled && !!address && !!contractAddress && !!currentTronNetwork,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

/**
 * Hook to fetch account resource (bandwidth and energy)
 * @param address - TRON address (base58)
 * @param enabled - Enable query
 * @returns Query result with resource data
 */
export function useAccountResource(address: string | undefined, enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useQuery<TronAccountResource, Error>({
    queryKey: ['tron', 'resource', address, currentTronNetwork?.id],
    queryFn: async () => {
      if (!address || !currentTronNetwork) {
        throw new Error('Address or network not available');
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      return fetchAccountResource(address, rpcUrl);
    },
    enabled: enabled && !!address && !!currentTronNetwork,
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 10000,
  });
}

/**
 * Hook to fetch multiple TRC20 balances
 * @param address - Owner address (base58)
 * @param contractAddresses - Array of token contract addresses
 * @param enabled - Enable query
 * @returns Query result with balances map
 */
export function useMultipleTrc20Balances(address: string | undefined, contractAddresses: string[], enabled = true) {
  const { currentTronNetwork } = useCurrentTronNetwork();

  return useQuery<Map<string, string>, Error>({
    queryKey: ['tron', 'balance', 'trc20-multiple', address, contractAddresses.join(','), currentTronNetwork?.id],
    queryFn: async () => {
      if (!address || !currentTronNetwork) {
        throw new Error('Address or network not available');
      }

      const rpcUrl = currentTronNetwork.rpcUrls[0]?.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available');
      }

      const balances = new Map<string, string>();

      await Promise.all(
        contractAddresses.map(async (contractAddress) => {
          try {
            const balance = await fetchTrc20Balance(address, contractAddress, rpcUrl);
            balances.set(contractAddress, balance);
          } catch (error) {
            console.error(`Failed to fetch balance for ${contractAddress}:`, error);
            balances.set(contractAddress, '0');
          }
        }),
      );

      return balances;
    },
    enabled: enabled && !!address && contractAddresses.length > 0 && !!currentTronNetwork,
    refetchInterval: 12000,
    staleTime: 8000,
  });
}
