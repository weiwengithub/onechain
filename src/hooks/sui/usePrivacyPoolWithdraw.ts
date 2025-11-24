/**
 * Privacy Pool Withdraw Hook
 * 处理隐私池提款操作
 */

import { useState, useCallback } from 'react';
import { usePrivacyPoolClient } from './usePrivacyPoolClient';
import { usePrivacyPool } from '@/zustand/hooks/usePrivacyPool';
import { useVoucherSigner } from './useVoucherSigner';
import type { DepositNote } from '@/types/privacyPool';

export function usePrivacyPoolWithdraw() {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const client = usePrivacyPoolClient();
  const { signer, error: signerError } = useVoucherSigner();
  const { markDepositAsSpent, addTransaction, updateTransaction } = usePrivacyPool();

  const withdraw = useCallback(
    async (
      note: DepositNote,
      recipient: string,
      relayer?: string,
      fee?: number
    ) => {
      if (!client) {
        throw new Error('Privacy pool client not initialized');
      }

      if (!signer) {
        throw new Error(signerError || 'Signer not available. Please unlock wallet.');
      }

      setIsWithdrawing(true);
      setIsGeneratingProof(true);
      setError(null);

      try {
        // 添加到待处理
        const txId = `withdraw-${Date.now()}`;
        addTransaction({
          id: txId,
          type: 'withdrawal',
          amount: note.denomination,
          timestamp: Date.now(),
          txDigest: '',
          status: 'pending',
          recipient,
        });

        // 生成证明
        setIsGeneratingProof(true);
        const proof = await client.generateWithdrawalProof(
          note,
          recipient,
          relayer,
          fee
        );
        setIsGeneratingProof(false);

        // 执行提款
        const { digest, events } = await client.withdraw(
          {
            note,
            recipient,
            relayer,
            fee,
          },
          signer
        );

        // 标记为已花费
        markDepositAsSpent(note.id);

        // 更新交易状态
        updateTransaction(txId, {
          txDigest: digest,
          status: 'confirmed',
        });

        return {
          digest,
          events,
        };
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsWithdrawing(false);
        setIsGeneratingProof(false);
      }
    },
    [client, signer, signerError, markDepositAsSpent, addTransaction, updateTransaction]
  );

  return {
    withdraw,
    isWithdrawing,
    isGeneratingProof,
    error,
  };
}
