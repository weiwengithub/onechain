import type { TronTransaction, TronTransactionDetail } from '@/types/tron/tx';
import type { TronTransactionInfo } from '@/types/tron/api';
import { TRON_RPC_METHOD } from '@/constants/tron';
import { base58ToHexAddress } from '../address';

export interface TronTransactionHistory {
  total: number;
  transactions: TronTransactionDetail[];
  hasMore: boolean;
}

/**
 * Fetch transaction history for an address
 * @param address - TRON address (base58)
 * @param rpcUrl - RPC endpoint URL (TronGrid API)
 * @param limit - Number of transactions to fetch
 * @param fingerprint - Pagination fingerprint
 * @returns Transaction history
 */
export async function fetchTransactionHistory(
  address: string,
  rpcUrl: string,
  limit = 20,
  fingerprint?: string,
): Promise<TronTransactionHistory> {
  const hexAddress = base58ToHexAddress(address);

  // TronGrid uses different endpoint format
  let url = `${rpcUrl}/v1/accounts/${hexAddress}/transactions?limit=${limit}`;
  if (fingerprint) {
    url += `&fingerprint=${fingerprint}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'TRON-PRO-API-KEY': '', // Add API key if needed
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction history: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    total: data.data?.length || 0,
    transactions: data.data || [],
    hasMore: data.meta?.fingerprint !== undefined,
  };
}

/**
 * Fetch transaction by ID
 * @param txId - Transaction ID
 * @param rpcUrl - RPC endpoint URL
 * @returns Transaction details
 */
export async function fetchTransactionById(txId: string, rpcUrl: string): Promise<TronTransaction | null> {
  const response = await fetch(`${rpcUrl}/${TRON_RPC_METHOD.GET_TRANSACTION_BY_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: txId,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return data as TronTransaction;
}

/**
 * Fetch transaction info by ID
 * @param txId - Transaction ID
 * @param rpcUrl - RPC endpoint URL
 * @returns Transaction info
 */
export async function fetchTransactionInfo(txId: string, rpcUrl: string): Promise<TronTransactionInfo | null> {
  const response = await fetch(`${rpcUrl}/${TRON_RPC_METHOD.GET_TRANSACTION_INFO_BY_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: txId,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return data as TronTransactionInfo;
}

/**
 * Fetch TRC20 transaction history
 * @param address - TRON address (base58)
 * @param contractAddress - TRC20 contract address (base58)
 * @param rpcUrl - RPC endpoint URL (TronGrid API)
 * @param limit - Number of transactions to fetch
 * @param fingerprint - Pagination fingerprint
 * @returns TRC20 transaction history
 */
export async function fetchTrc20TransactionHistory(
  address: string,
  contractAddress: string,
  rpcUrl: string,
  limit = 20,
  fingerprint?: string,
): Promise<TronTransactionHistory> {
  const hexAddress = base58ToHexAddress(address);
  const hexContractAddress = base58ToHexAddress(contractAddress);

  // TronGrid TRC20 transactions endpoint
  let url = `${rpcUrl}/v1/accounts/${hexAddress}/transactions/trc20?limit=${limit}&contract_address=${hexContractAddress}`;
  if (fingerprint) {
    url += `&fingerprint=${fingerprint}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'TRON-PRO-API-KEY': '', // Add API key if needed
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch TRC20 transaction history: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    total: data.data?.length || 0,
    transactions: data.data || [],
    hasMore: data.meta?.fingerprint !== undefined,
  };
}

/**
 * Wait for transaction confirmation
 * @param txId - Transaction ID
 * @param rpcUrl - RPC endpoint URL
 * @param maxAttempts - Maximum number of polling attempts
 * @param intervalMs - Polling interval in milliseconds
 * @returns Transaction info when confirmed, or null if timeout
 */
export async function waitForTransactionConfirmation(
  txId: string,
  rpcUrl: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<TronTransactionInfo | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const txInfo = await fetchTransactionInfo(txId, rpcUrl);

    if (txInfo && txInfo.blockNumber) {
      return txInfo;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}

/**
 * Check if transaction is confirmed
 * @param txId - Transaction ID
 * @param rpcUrl - RPC endpoint URL
 * @returns True if confirmed, false otherwise
 */
export async function isTransactionConfirmed(txId: string, rpcUrl: string): Promise<boolean> {
  const txInfo = await fetchTransactionInfo(txId, rpcUrl);
  return txInfo !== null && txInfo.blockNumber !== undefined;
}

/**
 * Parse transaction type
 * @param transaction - Transaction object
 * @returns Transaction type
 */
export function parseTransactionType(transaction: TronTransaction): string {
  const contract = transaction.raw_data.contract[0];
  return contract?.type || 'Unknown';
}

/**
 * Check if transaction is successful
 * @param txInfo - Transaction info
 * @returns True if successful, false otherwise
 */
export function isTransactionSuccessful(txInfo: TronTransactionInfo): boolean {
  return txInfo.receipt?.result === 'SUCCESS';
}
