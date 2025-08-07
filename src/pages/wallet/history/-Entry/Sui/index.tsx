import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter/index.tsx';
import OctChain from '@/assets/img/chains/oct.png';
import CopyIcon from '@/assets/img/icon/copy_primary.png';
import { useTranslation } from 'react-i18next';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import copy from 'copy-to-clipboard';
import { toastDefault, toastError } from '@/utils/toast.tsx';
import { getShortAddress } from '@/utils/string';
import { getShortDate } from '@/utils/date';
import { useTxInfo } from '@/hooks/sui/useTxInfo.ts';
import { useMemo } from 'react';
import { times, toDisplayDenomAmount } from '@/utils/numbers.ts';
import { SUI_COIN_TYPE } from '@/constants/sui';
import { usePrice } from '@/onechain/usePrice.ts';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets.ts';
import { getSuiCoinType } from '@/onechain/utils';

type SuiProps = {
  coinId: string;
  txHash?: string
  timestamp?: string | null
  isSender?: boolean
  displayAmount?: string
  symbol?: string
  address?: string
};

export default function Sui({ coinId, txHash, timestamp, isSender, displayAmount, symbol, address }: SuiProps) {
  const { t } = useTranslation();

  const { getSuiAccountAsset } = useGetAccountAsset({ coinId });

  const selectedCoinToSend = getSuiAccountAsset();
  const coinImageURL = selectedCoinToSend?.asset.image || '';

  const { getAccountAsset } = useGetAccountAsset({ coinId });
  const currentCoin = getAccountAsset();
  const currentAddress = currentCoin?.address.address || '';

  const currentAsset = getSuiAccountAsset();
  const txDetailExplorerURL = (() => {
    if (currentAsset?.chain.explorer?.tx) {
      return currentAsset?.chain.explorer?.tx.replace('${hash}', txHash || '');
    }

    if (currentAsset?.chain.explorer?.url) {
      return `${currentAsset?.chain.explorer?.url}/tx/${txHash || ''}`;
    }

    return '';
  })();

  const txInfo = useTxInfo({
    coinId,
    digest: txHash,
  });
  const { getSuiAccountAsset: getSuiAccountMainAsset } = useGetAccountAsset({ coinId: SUI_COIN_TYPE });
  const feeCoinAsset = getSuiAccountMainAsset()?.asset;
  const feeCoinDecimals = feeCoinAsset?.decimals || 9;
  const gasFee = useMemo(() => {
    if (txInfo.data?.result?.effects) {
      const storageCost = Number(txInfo.data.result.effects.gasUsed.storageCost);
      const nonRefundableStorageFee = Number(txInfo.data.result.effects.gasUsed.nonRefundableStorageFee);
      const gasFee = (storageCost + nonRefundableStorageFee);
      return toDisplayDenomAmount(gasFee, feeCoinDecimals);
    } else {
      return '-';
    }
  }, [feeCoinDecimals, txInfo]);

  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
  });
  const FEE_COIN_TYPE = getSuiCoinType(coinId);
  const selectedFeeAsset = accountAllAssets?.suiAccountAssets.find((item) => item.asset.id === FEE_COIN_TYPE)?.asset;
  const coinFeeSymbol = selectedFeeAsset?.symbol || '';

  const { chainPrice } = usePrice({ coinId: currentCoin?.asset.id, coinGeckoId: currentCoin?.asset.coinGeckoId });

  const totalValue = times(displayAmount || 0, chainPrice);

  const copyToClipboard = (address: string | null | undefined) => {
    if (!address) return;
    if (copy(address)) {
      toastDefault(t('components.MainBox.CoinDetailBox.index.copied'));
    } else {
      toastError(t('components.MainBox.CoinDetailBox.index.copyFailed'));
    }
  };

  const fromAddr = useMemo(() => {
    return isSender ? currentAddress : address;
  }, [address, currentAddress, isSender]);

  const toAddr = useMemo(() => {
    return isSender ? address : currentAddress;
  }, [address, currentAddress, isSender]);

  return (
    <>
      <BaseBody>
        <div className="flex items-center justify-center">
          <img
            src={coinImageURL}
            alt="oct"
            className="size-[24px]"
          />
          <div className="ml-[8px] h-[22px] text-[18px] leading-[22px] font-medium text-white">{symbol}</div>
        </div>
        {!isSender && (
          <div className="mt-[12px] h-[24px] text-center text-[24px] leading-[24px] font-bold text-[#1bb292]">
            {displayAmount ? `+${parseFloat(displayAmount)}` : '-'}
          </div>
        )}
        {isSender && (
          <div className="mt-[12px] h-[24px] text-center text-[24px] leading-[24px] font-bold text-[#e04646]">
            {displayAmount ? `-${parseFloat(displayAmount)}` : '-'}
          </div>
        )}
        <div
          className="mt-[8px] h-[22px] text-center text-[14px] leading-[22px] text-white opacity-60"
        >≈${totalValue}</div>
        <div className="relative mt-[24px] h-[192px] overflow-hidden rounded-[12px] bg-[#1E2025] pr-[10px] pl-[10px]">
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">Transaction Digest</div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(txHash)}</span>
              <img
                src={CopyIcon}
                alt="copy"
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => copyToClipboard(txHash)}
              />
            </div>
          </div>
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">Time</div>
            <div
              className="text-white"
            >{timestamp ? getShortDate(Number(timestamp), 'MMM DD, YYYY HH:mm:ss') : '-'}</div>
          </div>
          {fromAddr && <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">From</div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(fromAddr)}</span>
              <img
                src={CopyIcon}
                alt="copy"
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => copyToClipboard(fromAddr)}
              />
            </div>
          </div>}
          {toAddr && <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">To</div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(toAddr)}</span>
              <img
                src={CopyIcon}
                alt="copy"
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => copyToClipboard(toAddr)}
              />
            </div>
          </div>}
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">Gas Fee</div>
            <div className="text-white">
              {gasFee} {coinFeeSymbol}
            </div>
          </div>
        </div>
      </BaseBody>
      <BaseFooter>
        <button
          className="!mb-[46px] w-full h-[50px] rounded-[12px] bg-[#0047c4] !text-[18px] font-bold text-white hover:bg-[#3B82FF]"
          onClick={() => {
            window.open(txDetailExplorerURL, '_blank');
          }}
        >
          View on explorer
        </button>
      </BaseFooter>
    </>
  );
}
