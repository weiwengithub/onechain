import { useMemo } from 'react';

import { divide, plus } from '@/utils/numbers';
import { toPercentages } from '@/utils/string';

import { useGetAPY } from './useGetAPY';
import { type UseFetchConfig } from '../common/useFetch';

type UseGetAverageAPYProps = {
  coinId: string;
  config?: UseFetchConfig;
};

export function useGetAverageAPY({ coinId, config }: UseGetAverageAPYProps) {
  const { data: suiAPY } = useGetAPY({ coinId, config });
  
  const averageAPY = useMemo(() => {
    const validApys = suiAPY?.result?.apys?.filter(item => item.apy !== null && item.apy !== undefined) || [];

    if (validApys.length === 0) {
      return '0.00';
    }

    const apySum = validApys.reduce((acc, item) => {
      return plus(acc, item.apy);
    }, '0');

    return toPercentages(divide(apySum, validApys.length), {
      fixed: 2,
      disableMark: true,
    });
  }, [suiAPY?.result?.apys]);

  return { averageAPY };
}
