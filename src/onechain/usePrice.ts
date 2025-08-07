import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice.ts';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import { useMemo } from 'react';
import { useOctPrice } from '@/onechain/useOctPrice.ts';

type Props = {
  coinGeckoId?:string;
  coinId?:string;
}

export const usePrice = (props:Props)=>{
  const {coinGeckoId, coinId} = props;

  const {priceInfo} = useOctPrice();
  const octPrice = coinId ? priceInfo[coinId]?.octPrice ?? 0 : 0;
  const octPricePercent = coinId ? priceInfo[coinId]?.octPricePercent ?? 0 : 0;
  const { data: coinGeckoPrice } = useCoinGeckoPrice();
  const { userCurrencyPreference } = useExtensionStorageStore((state) => state);

  const { chainPrice, chainPricePercent } = useMemo(() => {
    let price = 0;
    let pricePercent = 0;

    if (!coinGeckoId) {
      return {chainPrice:0, chainPricePercent:0};
    }
    if (coinGeckoId.startsWith('oct')) {
      price = octPrice;
      pricePercent = octPricePercent;
    }else {
      price = coinGeckoPrice?.[coinGeckoId]?.[userCurrencyPreference] ?? 0;
      pricePercent = Number( (coinGeckoId && coinGeckoPrice?.[coinGeckoId]?.[`${userCurrencyPreference}_24h_change`]) || 0);
    }
    return {chainPrice:price, chainPricePercent:pricePercent};

  }, [octPrice,coinGeckoPrice,userCurrencyPreference, coinGeckoId, octPricePercent]);

  return { chainPrice, chainPricePercent };
}
