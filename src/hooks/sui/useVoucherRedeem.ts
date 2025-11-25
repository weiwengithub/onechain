/**
 * useVoucherRedeem Hook
 * 兑换支票功能
 */

import { useState } from 'react';
import { VoucherClient } from '@/libs/voucher/client';
import type { RedeemVoucherParams } from '@/types/voucher';
import { useVoucherSigner } from './useVoucherSigner';
import { showVoucherError, createVoucherError, VoucherErrorCode } from '@/utils/voucherError';

export interface UseVoucherRedeemResult {
  redeemVoucher: (params: RedeemVoucherParams) => Promise<{ success: boolean; digest?: string; amount?: number }>;
  isRedeeming: boolean;
  isGeneratingProof: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useVoucherRedeem(): UseVoucherRedeemResult {
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { signer, chainId, error: signerError, signingContext } = useVoucherSigner();

  const redeemVoucher = async (
    params: RedeemVoucherParams,
  ): Promise<{ success: boolean; digest?: string; amount?: number }> => {
    setIsRedeeming(true);
    setError(null);

    try {
      // 检查签名器
      if (!signer || !signingContext) {
        throw new Error(signerError || 'Signer not available. Please unlock wallet.');
      }

      // 确定网络 (从 chainId 中提取)
      const network = chainId.startsWith('oct-testnet')
        ? 'oct-testnet'
        : 'oct';

      const client = new VoucherClient(network);

      // 检查支票是否已兑换
      const alreadyRedeemed = await client.isVoucherRedeemed(params.voucherCode);
      if (alreadyRedeemed) {
        throw createVoucherError(VoucherErrorCode.VOUCHER_ALREADY_REDEEMED);
      }

      // 开始生成证明
      setIsGeneratingProof(true);

      const { digest, amount } = await client.redeemVoucher(params, signingContext);

      console.log('Voucher redeemed successfully:', {
        digest,
        amount: amount / 1e9,
      });

      return {
        success: true,
        digest,
        amount,
      };
    } catch (err) {
      const error = err as Error;
      console.error('Failed to redeem voucher:', error);

      // 显示友好的错误提示
      showVoucherError(error);

      setError(error);
      return { success: false };
    } finally {
      setIsGeneratingProof(false);
      setIsRedeeming(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    redeemVoucher,
    isRedeeming,
    isGeneratingProof,
    error,
    clearError,
  };
}
