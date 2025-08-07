import type { BaseCoinButtonProps } from '../common/BaseCoinButton';
import BaseCoinButton from '../common/BaseCoinButton';
import type { BaseCoinImageProps } from '../common/BaseCoinImage';
// import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice';
// import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { usePrice } from '@/onechain/usePrice.ts';
import DefaultCoinImage from '@/assets/images/coin/defaultCoin.png';

type CoinWithMarketTrendButtonProps = BaseCoinButtonProps & {
  coinImageProps: BaseCoinImageProps;
};

export default function CoinWithMarketTrendButton({
                                                    symbol,
                                                    coinImageProps,
                                                    ...remainder
                                                  }: CoinWithMarketTrendButtonProps) {
  const coinSymbol = symbol || 'UNKNOWN';

  // 拆分 symbol 为 mainSymbol 和 extraSymbol
  const symbolParts = coinSymbol.split('-');
  const mainSymbol = symbolParts[0];
  const extraSymbol = symbolParts.length > 1 ? symbolParts.slice(1).join('-') : undefined;

  const { coinId, coinGeckoId } = remainder;

  const { chainPrice, chainPricePercent } = usePrice({ coinId, coinGeckoId });

  return (
    <BaseCoinButton
      leftComponent={
        <>
          <div className="size-[42px]">
            <img
              src={coinImageProps.imageURL ?? DefaultCoinImage}
              alt={mainSymbol}
              className="h-full w-full"
            />
          </div>
          <div className="ml-[10px] flex-1">
            <div className={'flex flex-1 flex-row items-center h-[18px]'}>
              <div className="flex text-[18px] leading-[16px] text-white font-bold">
                {mainSymbol}
              </div>
              {extraSymbol && (
                <div className={'text-[10px] ml-[5px] text-white/70'}>{extraSymbol}</div>
              )}
            </div>
            <div className="mt-[5px] flex h-[16px] text-[12px] leading-[16px]">
              <span className="text-white opacity-60">{chainPrice.toFixed(2)}</span>
              {chainPricePercent === 0 && <span className="ml-[8px] text-[#1bb292]">+{chainPricePercent}%</span>}
              {chainPricePercent > 0 &&
                <span className="ml-[8px] text-[#1bb292]">+{chainPricePercent.toFixed(2)}%</span>}
              {chainPricePercent < 0 &&
                <span className="ml-[8px] text-[#e04646]">{chainPricePercent.toFixed(2)}%</span>}
            </div>
          </div>
        </>
      }
      {...remainder}
    />
  );
}
