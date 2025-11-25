import useSWR from 'swr';
import { useCallback, useMemo } from 'react';
import oneChainApi from '@/onechain/api';
import type { MarketPriceInfo } from '@/onechain/api/type.ts';

export type PriceReq = {
  refreshInterval?: number;
};

export const useOctPrice = (params?: PriceReq) => {

  const refreshInterval = params?.refreshInterval ?? 1000 * 60 * 10;

  const key = useMemo(() => {
    return `/octMarketPrice/`;
  }, []);

  const fetchData = useCallback(async (): Promise<MarketPriceInfo[] | undefined> => {
    const res = await oneChainApi.getMarketPrice();

    return res?.data;
  }, []);

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR<MarketPriceInfo[] | undefined, Error>(key, fetchData, {
    refreshInterval,
  });

  const priceInfo = useMemo(() => {
    const info: Record<string, MarketPriceInfo> = {};
    if (data) {

      for (const item of data) {
        const contractAddress = item.contractAddress;
        if (contractAddress) {
          const octPrice = Number(item.price ?? 0.0);
          const percentStr = item.percentChange24h ?? '0';
          const octPricePercent = parseFloat(percentStr.replace('%', ''));
          info[contractAddress] = {
            octPrice,
            octPricePercent,
            ...item,
          };
        }
      }
    }
    return info;
  }, [data]);

  const res = useMemo(() => {
    return {
      priceInfo,
      error,
      getPrice: mutate,
      isLoading,
    };
  }, [priceInfo, error, mutate, isLoading]);

  return res;
};
