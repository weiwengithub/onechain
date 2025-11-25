import { useMutation } from '@tanstack/react-query';
import { toastError, toastSuccess } from '@/utils/toast';
import { OCT_FAUCET_URL, SUI_FAUCET_URL } from '@/constants/sui';
import { useForceRefreshBalance } from '@/hooks/useForceRefreshBalance';

type FaucetRequest = {
  FixedAmountRequest: {
    recipient: string;
  };
};

type FaucetResponse = {
  transferredGasObjects?: {
    amount?: number;
    id?: string;
    transferTxDigest?: string;
  }[];
  error?: null | string;
};

export function useFaucet() {
  const { forceRefresh } = useForceRefreshBalance();

  const faucetMutation = useMutation({
    mutationFn: async ({ recipient, chainId }: { recipient: string; chainId: string }) => {
      const requestBody: FaucetRequest = {
        FixedAmountRequest: {
          recipient,
        },
      };

      const url = chainId.includes('oct-testnet')
        ? OCT_FAUCET_URL
        : chainId.includes('sui-testnet')
          ? SUI_FAUCET_URL
          : '';

      if (!url) {
        throw new Error(`Unsupported chain for faucet: ${chainId}`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Faucet request failed with status ${response.status}: ${errorText}`);
      }

      const result: FaucetResponse = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: async (data) => {
      toastSuccess(`Successfully received tokens from faucet`);

      // 强制刷新余额
      try {
        await forceRefresh();
      } catch (error) {
        console.error('Failed to refresh balance:', error);
      }

    },
    onError: (error: Error) => {
      toastError(`Faucet request failed: ${error.message}`);
    },
  });

  return {
    requestFaucet: faucetMutation.mutate,
    isRequesting: faucetMutation.isPending,
    error: faucetMutation.error,
  };
}
