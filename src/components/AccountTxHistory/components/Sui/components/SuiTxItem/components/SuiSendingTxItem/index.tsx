import { useTranslation } from 'react-i18next';

import { SUI_TOKEN_TEMPORARY_DECIMALS } from '@/constants/sui';
import { useGetCoinMetadata } from '@/hooks/sui/useGetCoinMetadata';
import type { SendTransactionInfo } from '@/types/sui/parseTx';
import { toDisplayDenomAmount } from '@/utils/numbers';
import { shorterAddress } from '@/utils/string';
import ReceiveIcon from '@/assets/img/icon/wallet_home_receive.png';
import SwapIcon from '@/assets/img/icon/wallet_home_swap.png';
import { cn } from '@/utils/date.ts';
// import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { Route as TxHistory } from '@/pages/wallet/history';
import { useNavigate } from '@tanstack/react-router';
import { getSuiCoinType } from '@/onechain/utils';

type SuiSendingTxItemProps = {
  tx: SendTransactionInfo;
  digest: string;
  coinId: string;
  timestampMs?: string | null;
};

export default function SuiSendingTxItem({ tx, digest, timestampMs, coinId }: SuiSendingTxItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // const { getSuiAccountAsset } = useGetAccountAsset({ coinId });
  // const currentAsset = getSuiAccountAsset();

  const SUI_COIN_TYPE = getSuiCoinType(coinId);

  const sendingTransactionInfo = tx;

  const { isSender, sender, recipient, coinAmount, coinType } = sendingTransactionInfo;

  const { data: coinMetaData } = useGetCoinMetadata({
    coinType: coinType === SUI_COIN_TYPE ? '' : coinType || '',
    coinId,
  });

  const decimals = coinMetaData?.result?.decimals || SUI_TOKEN_TEMPORARY_DECIMALS;
  const symbol = coinMetaData?.result?.symbol || coinType?.split('::')[2] || '';

  // const txDetailExplorerURL = (() => {
  //   if (currentAsset?.chain.explorer?.tx) {
  //     return currentAsset?.chain.explorer?.tx.replace('${hash}', digest || '');
  //   }
  //
  //   if (currentAsset?.chain.explorer?.url) {
  //     return `${currentAsset?.chain.explorer?.url}/tx/${digest || ''}`;
  //   }
  //
  //   return '';
  // })();

  // const formattedTimestamp = (() => {
  //   if (!timestampMs) {
  //     return '';
  //   }
  //   const normalizedTxTime = isUnixTimestamp(timestampMs) ? Number(timestampMs) : timestampMs;
  //
  //   const date = new Date(normalizedTxTime);
  //
  //   return `${date.getHours().toString().padStart(2, '0')} : ${date.getMinutes().toString().padStart(2, '0')} :${date.getSeconds().toString().padStart(2, '0')}`;
  // })();

  const detail = (() => {
    const formattedSymbol = symbol && symbol.length > 10 ? `${symbol.slice(0, 10)}...` : symbol;

    const sendingObject = sendingTransactionInfo.objectId ? 'NFT' : formattedSymbol;

    const title = isSender
      ? t('components.AccountTxHistory.components.Sui.components.SuiTxItem.components.SuiSendingTxItem.index.sent', {
        object: sendingObject,
      })
      : t('components.AccountTxHistory.components.Sui.components.SuiTxItem.components.SuiSendingTxItem.index.received', {
        object: sendingObject,
      });

    const otherAddress = isSender ? recipient : sender;
    const formattedOtherAddress = shorterAddress(otherAddress, 16);

    const subTitle = isSender
      ? t('components.AccountTxHistory.components.Sui.components.SuiTxItem.components.SuiSendingTxItem.index.to', {
        address: formattedOtherAddress,
      })
      : t('components.AccountTxHistory.components.Sui.components.SuiTxItem.components.SuiSendingTxItem.index.from', {
        address: formattedOtherAddress,
      });

    const displayAmount = coinAmount && toDisplayDenomAmount(coinAmount, decimals);
    const balanceChangedMark = isSender ? `-` : `+`;
    return {
      title,
      subTitle,
      amount: displayAmount
        ? {
          displayAmount,
          symbol: formattedSymbol,
          balanceChangedMark,
        }
        : undefined,
    };
  })();

  const transactionTypeLabel = isSender
    ? t('components.AccountTxHistory.components.Sui.components.SuiTxItem.components.SuiSendingTxItem.index.typeSend')
    : t('components.AccountTxHistory.components.Sui.components.SuiTxItem.components.SuiSendingTxItem.index.typeReceive');

  return (
    <div
      className="border-[#2c3039] mb-[16px] flex items-center border-b border-solid pb-[16px]"
      onClick={() => {
        navigate({
          to: TxHistory.to,
          search: {
            coinId,
            txHash: digest,
            timestamp: timestampMs,
            isSender,
            displayAmount: detail.amount?.displayAmount,
            symbol: detail.amount?.symbol,
            address: isSender ? recipient : sender,
          },
        });
      }}
    >
      <div className="size-[32px] rounded-[40px] bg-[#1E2025]">
        <img className="mx-auto mt-[6px] size-[20px]" src={isSender ? SwapIcon : ReceiveIcon} alt="receive" />
      </div>
      <div className="ml-[8px] flex-1">
        <div className="h-[16px] text-[14px] leading-[16px] text-white">{transactionTypeLabel}</div>
        <div className="mt-[4px] h-[12px] text-[12px] leading-[12px] text-white opacity-40">{detail.subTitle}</div>
      </div>
      <div
        className={cn('ml-[8px] h-[16px] text-[14px] leading-[16px] font-bold', isSender ? 'text-white' : 'text-[#1bb292]')}
      >
        {detail.amount ? `${detail.amount.balanceChangedMark}${Number(parseFloat(detail.amount.displayAmount).toFixed(6))} ${detail.amount.symbol}` : ''}
      </div>
    </div>
  );
}
