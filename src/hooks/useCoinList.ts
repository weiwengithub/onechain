import { useQuery } from '@tanstack/react-query';

import { getAssets } from '@/libs/asset';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { isZkLoginAccount } from '@/utils/zklogin';

export function useCoinList() {
  const { currentAccount } = useCurrentAccount();

  const fetcher = async () => {
    const forZkLoginOnly = currentAccount ? isZkLoginAccount(currentAccount) : false;
    const coinAssets = await getAssets(forZkLoginOnly);

    const flatCoinList = coinAssets ? Object.values(coinAssets).flat() : [];

    return {
      ...coinAssets,
      flatCoinList,
    };
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['coinList', currentAccount?.id, currentAccount?.type],
    queryFn: fetcher,
    staleTime: Infinity,
  });

  return { data, isLoading, error };
}
