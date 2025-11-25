/**
 * Privacy Pool Deposit Hook
 * 处理隐私池存款操作
 */

import { useState, useCallback } from 'react';
import { usePrivacyPoolClient } from './usePrivacyPoolClient';
import { usePrivacyPool } from '@/zustand/hooks/usePrivacyPool';
import { useVoucherSigner } from './useVoucherSigner';
import type { DepositNote } from '@/types/privacyPool';

export function usePrivacyPoolDeposit() {
  const [isDepositing, setIsDepositing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = usePrivacyPoolClient();
  const { signer, chainId, error: signerError } = useVoucherSigner();
  const { addDeposit, addTransaction, updateTransaction } = usePrivacyPool();

  const deposit = useCallback(
    async (denomination: number, coinIds: string[]) => {
      if (!client) {
        throw new Error('Privacy pool client not initialized');
      }

      if (!signer) {
        throw new Error(signerError || 'Signer not available. Please unlock wallet.');
      }

      setIsDepositing(true);
      setError(null);

      try {
        // 确定网络
        const network = chainId.startsWith('oct-testnet')
          ? 'oct-testnet'
          : chainId.startsWith('oct')
          ? 'oct'
          : 'mainnet';

        // 生成 deposit note
        const note = await client.generateDeposit(denomination, network);

        // 添加到待处理
        const txId = `deposit-${Date.now()}`;
        addTransaction({
          id: txId,
          type: 'deposit',
          amount: denomination,
          timestamp: Date.now(),
          txDigest: '',
          status: 'pending',
          note,
        });

        // 执行存款
        const { digest, events } = await client.deposit(
          note,
          coinIds,
          signer
        );

        // 更新 note
        if (events.length > 0) {
          note.leafIndex = events[0].leafIndex;
          note.txDigest = digest;
        }

        // 保存 note
        addDeposit(note);

        // 更新交易状态
        updateTransaction(txId, {
          txDigest: digest,
          status: 'confirmed',
        });

        return {
          note,
          digest,
          events,
        };
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsDepositing(false);
      }
    },
    [client, signer, chainId, signerError, addDeposit, addTransaction, updateTransaction]
  );

  return {
    deposit,
    isDepositing,
    error,
  };
}
