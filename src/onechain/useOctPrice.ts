import useSWR from "swr";
import { useCallback, useMemo } from 'react';
import oneChainApi from '@/onechain/api';
import { MarketPriceInfo } from '@/onechain/api/type.ts';

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
  }, [oneChainApi]);

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
      for (let i = 0; i < data.length; i++) {
        const contractAddress = data[i].contractAddress;
        if (contractAddress) {
          const octPrice = Number(data[i]?.price ?? 0.0);
          const percentStr = data[i]?.percentChange24h ?? "0";
          const octPricePercent = parseFloat(percentStr.replace("%", ""));
          info[contractAddress] = {
            octPrice,
            octPricePercent,
            ...data[i]
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
      getPrice:mutate,
      isLoading,
    };
  }, [priceInfo, error, mutate, isLoading]);

  return res;
};
