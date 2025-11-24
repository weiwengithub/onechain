/**
 * useVoucherCreate Hook
 * 开支票功能
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VoucherClient } from '@/libs/voucher/client';
import type { Voucher, CreateVoucherParams } from '@/types/voucher';
import { useVoucherSigner } from './useVoucherSigner';
import { showVoucherError } from '@/utils/voucherError';
import { toastSuccess } from '@/utils/toast';

export interface UseVoucherCreateResult {
  createVoucher: (params: CreateVoucherParams) => Promise<Voucher | null>;
  isCreating: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useVoucherCreate(): UseVoucherCreateResult {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { signer, chainId, error: signerError, signingContext } = useVoucherSigner();
  const { t } = useTranslation();

  const createVoucher = async (params: CreateVoucherParams): Promise<Voucher | null> => {
    setIsCreating(true);
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

      const { voucher, digest } = await client.createVoucher(params, signingContext);

      console.log('Voucher created successfully:', {
        voucherCode: voucher.voucherCode,
        txDigest: digest,
      });

      // 成功提示
      toastSuccess(t('pages.onetransfer.toasts.issueSuccess'));

      return voucher;
    } catch (err) {
      const error = err as Error;
      console.error('Failed to create voucher:', error);

      // 显示友好的错误提示
      showVoucherError(error);

      setError(error);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    createVoucher,
    isCreating,
    error,
    clearError,
  };
}
