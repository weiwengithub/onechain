import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice.ts';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import { useMemo } from 'react';
import { useOctPrice } from '@/onechain/useOctPrice.ts';
import { useRwaPrice } from '@/onechain/useRwaPrice.ts';

type Props = {
  coinGeckoId?: string;
  coinId?: string;
}

export const usePrice = (props: Props) => {
  const { coinGeckoId, coinId } = props;
  // "oct-testnet-MBSR26"  "0xab2ea54393f43015e462244726160d3c8cbf979f87e240506e3e82938ab357c0::mbsr26::MBSR26"

  // debugger;

  const { priceInfo } = useOctPrice();
  const { price: rwaPrice } = useRwaPrice({ coinGeckoId, coinId });
  const octPrice = coinId ? priceInfo[coinId]?.octPrice ?? 0 : 0;
  const octPricePercent = coinId ? priceInfo[coinId]?.octPricePercent ?? 0 : 0;
  const { data: coinGeckoPrice } = useCoinGeckoPrice();
  const { userCurrencyPreference } = useExtensionStorageStore((state) => state);

  const { chainPrice, chainPricePercent } = useMemo(() => {
    let price = 0;
    let pricePercent = 0;

    if (!coinGeckoId) {
      return { chainPrice: 0, chainPricePercent: 0 };
    }
    if (coinGeckoId.startsWith('oct')) {
      if (octPrice === 0) {
        price = rwaPrice;
        pricePercent = octPricePercent;
      } else {
        price = octPrice;
        pricePercent = octPricePercent;
      }

    } else {
      price = coinGeckoPrice?.[coinGeckoId]?.[userCurrencyPreference] ?? 0;
      pricePercent = Number((coinGeckoId && coinGeckoPrice?.[coinGeckoId]?.[`${userCurrencyPreference}_24h_change`]) || 0);
    }
    return { chainPrice: price, chainPricePercent: pricePercent };

  }, [coinGeckoId, octPrice, rwaPrice, octPricePercent, coinGeckoPrice, userCurrencyPreference]);

  return { chainPrice, chainPricePercent };
};
