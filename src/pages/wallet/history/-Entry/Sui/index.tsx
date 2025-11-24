import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter/index.tsx';
import OctChain from '@/assets/img/chains/oct.png';
import CopyIcon from '@/assets/img/icon/copy_primary.png';
import { useTranslation } from 'react-i18next';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { useClipboard } from '@/hooks/useClipboard';
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
import type { BuyRwaTokenEvent } from '@/types/sui/parseTx.ts';

// RWA Event Types (duplicated from parseTx.ts for standalone use)
interface DividendBatchSubmitEvent {
  dividend_funds: string;
  rwa_token_total_supply: string;
}

interface DividendListAddEvent {
  user: string;
  participating_dividend: string;
}

interface UserDividendFundsClaimEvent {
  amount: string;
  recipient: string;
}

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
  const { t, i18n } = useTranslation();
  const { copyToClipboard } = useClipboard();
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
      return '';
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

  const fromAddr = useMemo(() => {
    return isSender ? currentAddress : address;
  }, [address, currentAddress, isSender]);

  const toAddr = useMemo(() => {
    return isSender ? address : currentAddress;
  }, [address, currentAddress, isSender]);

  // Parse RWA-specific information from transaction events
  const rwaInfo = useMemo(() => {
    if (!txInfo.data?.result?.events) {
      return null;
    }

    const events = txInfo.data.result.events;

    // Check for DividendBatchSubmitEvent
    const submitEvent = events.find(event =>
      event.type?.includes('DividendBatchSubmitEvent'),
    );

    if (submitEvent?.parsedJson) {
      const parsedJson = submitEvent.parsedJson as DividendBatchSubmitEvent;
      const dividendFunds = parsedJson.dividend_funds;
      const totalSupply = parsedJson.rwa_token_total_supply;

      // Convert from smallest unit (assuming 9 decimals for USDH)
      const dividendAmount = (parseInt(dividendFunds) / 1e9).toString();

      return {
        type: 'submit_batch',
        dividendAmount,
        totalSupply,
      };
    }

    // Check for DividendListAddEvent
    const addEvents = events.filter(event =>
      event.type?.includes('DividendListAddEvent'),
    );

    if (addEvents.length > 0) {
      const recipients = addEvents.map(event => {
        if (event.parsedJson) {
          const parsedJson = event.parsedJson as DividendListAddEvent;
          const user = parsedJson.user;
          const percentage = parsedJson.participating_dividend;

          return {
            address: user,
            percentage: parseInt(percentage),
          };
        }
        return null;
      }).filter(Boolean);

      return {
        type: 'add_list',
        recipients,
      };
    }

    // Check for UserDividendFundsClaimEvent
    const claimEvent = events.find(event =>
      event.type?.includes('UserDividendFundsClaimEvent'),
    );

    if (claimEvent?.parsedJson) {
      const parsedJson = claimEvent.parsedJson as UserDividendFundsClaimEvent;
      const amount = parsedJson.amount;
      const recipient = parsedJson.recipient;

      // Convert from smallest unit (assuming 6 decimals for USDH)
      const claimedAmount = (parseInt(amount) / 1e6).toString();

      return {
        type: 'claim_funds',
        claimedAmount,
        recipient,
      };
    }

    // Check for BuyRwaTokenEvent
    const buyEvent = events.find(event =>
      event.type?.includes('BuyRwaTokenEvent'),
    );

    if (buyEvent?.parsedJson) {
      const parsedJson = buyEvent.parsedJson as BuyRwaTokenEvent;
      const buyAmount = parsedJson.buy_amount;
      const payAmount = parsedJson.pay_amount;
      const price = parsedJson.price;

      // Convert from smallest unit (assuming 9 decimals for USDH)
      const displayBuyAmount = buyAmount;
      const displayPayAmount = (parseInt(payAmount) / 1e9).toString();
      const displayPrice = (parseInt(price) / 1e9).toString();

      return {
        type: 'buy_token',
        buyAmount: displayBuyAmount,
        payAmount: displayPayAmount,
        price: displayPrice,
      };
    }

    return null;
  }, [txInfo.data?.result?.events]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Extract token symbol from coin type string
  const extractTokenSymbol = (coinType: string): string => {
    if (!coinType) return '';

    // Handle coin type like "0x2::coin::Coin<0x...::module::SYMBOL>"
    const match = coinType.match(/<([^>]+)>/);
    if (match) {
      const innerType = match[1];
      const parts = innerType.split('::');
      return parts[parts.length - 1]; // Get the last part as symbol
    }

    // Handle direct coin type like "0x...::module::SYMBOL"
    const parts = coinType.split('::');
    return parts[parts.length - 1] || '';
  };

  // Extract token symbols from transaction data
  const getTokenSymbols = () => {
    if (!txInfo.data?.result) {
      return { dividendSymbol: 'Token', rwaSymbol: 'RWA' }; // fallback
    }

    let dividendSymbol = '';
    let rwaSymbol = '';

    // Extract from transaction inputs
    const transaction = txInfo.data.result.transaction?.data?.transaction;
    if (transaction?.kind === 'ProgrammableTransaction') {
      const inputs = transaction.inputs || [];

      // Look for coin objects in inputs
      inputs.forEach(input => {
        if (input.type === 'object' && input.objectType?.includes('::coin::Coin<')) {
          const symbol = extractTokenSymbol(input.objectType);
          if (symbol && symbol !== 'SUI' && !dividendSymbol) {
            dividendSymbol = symbol;
          }
        }
      });
    }

    // Extract from object changes
    const objectChanges = txInfo.data.result.objectChanges || [];
    objectChanges.forEach(change => {
      if (change.type === 'created' || change.type === 'mutated') {
        if (change.objectType?.includes('::coin::Coin<')) {
          const symbol = extractTokenSymbol(change.objectType);
          if (symbol && symbol !== 'SUI' && !dividendSymbol) {
            dividendSymbol = symbol;
          }
        }
        // Look for RWA token metadata
        if (change.objectType?.includes('CoinMetadata<')) {
          const symbol = extractTokenSymbol(change.objectType);
          if (symbol && !rwaSymbol) {
            rwaSymbol = symbol;
          }
        }
      }
    });

    // Try to extract from balance changes
    const balanceChanges = txInfo.data.result.balanceChanges || [];
    balanceChanges.forEach(change => {
      if (change.coinType && change.coinType !== '0x2::sui::SUI') {
        const symbol = extractTokenSymbol(change.coinType);
        if (symbol && !dividendSymbol) {
          dividendSymbol = symbol;
        }
      }
    });

    // Fallback values if nothing found
    if (!dividendSymbol) dividendSymbol = 'USDH';
    if (!rwaSymbol) rwaSymbol = 'RWA';

    return { dividendSymbol, rwaSymbol };
  };

  const { dividendSymbol, rwaSymbol } = useMemo(() => getTokenSymbols(), [txInfo.data?.result]);
  const historyKey = 'pages.wallet.history.entry.Sui.index';
  const isChinese = i18n.language?.toLowerCase().startsWith('zh');
  const approximateValue = totalValue ? Number(totalValue).toString() : '0';
  const formattedTimestamp = timestamp
    ? isChinese
      ? getShortDate(Number(timestamp), 'YYYY年M月D日 HH:mm:ss', 'zh-CN')
      : getShortDate(Number(timestamp), 'MMM DD, YYYY HH:mm:ss', 'en-US')
    : '-';

  return (
    <>
      <BaseBody>
        <div className="flex items-center justify-center">
          <img
            src={coinImageURL}
            alt={t(`${historyKey}.coinImageAlt`)}
            className="size-[24px]"
          />
          <div className="ml-[8px] h-[22px] text-[18px] leading-[22px] font-medium text-white">{symbol}</div>
        </div>
        {!isSender && (
          <div className="mt-[12px] h-[24px] text-center text-[24px] leading-[24px] font-bold text-[#1bb292]">
            {displayAmount ? `+${parseFloat(displayAmount)}` : ''}
          </div>
        )}
        {isSender && (
          <div className="mt-[12px] h-[24px] text-center text-[24px] leading-[24px] font-bold text-[#e04646]">
            {displayAmount ? `-${parseFloat(displayAmount)}` : ''}
          </div>
        )}
        <div className="mt-[8px] h-[22px] text-center text-[14px] leading-[22px] text-white opacity-60">
          {t(`${historyKey}.approxValue`, { value: approximateValue })}
        </div>
        <div className="relative mt-[24px] overflow-hidden rounded-[12px] bg-[#1E2025] pr-[10px] pl-[10px] pb-[12px]">
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t(`${historyKey}.txDigest`)}</div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(txHash)}</span>
              <img
                src={CopyIcon}
                alt={t(`${historyKey}.copyAlt`)}
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => txHash && copyToClipboard(txHash)}
              />
            </div>
          </div>
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t(`${historyKey}.time`)}</div>
            <div className="text-white">{formattedTimestamp}</div>
          </div>
          {fromAddr && <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t(`${historyKey}.from`)}</div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(fromAddr)}</span>
              <img
                src={CopyIcon}
                alt={t(`${historyKey}.copyAlt`)}
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => copyToClipboard(fromAddr)}
              />
            </div>
          </div>}
          {toAddr && <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t(`${historyKey}.to`)}</div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(toAddr)}</span>
              <img
                src={CopyIcon}
                alt={t(`${historyKey}.copyAlt`)}
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => copyToClipboard(toAddr)}
              />
            </div>
          </div>}
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t(`${historyKey}.gasFee`)}</div>
            <div className="text-white">
              {gasFee} {coinFeeSymbol}
            </div>
          </div>

          {/* RWA Transaction Details */}
          {rwaInfo && (
            <div className="mt-[12px] pt-[12px] border-t border-[#2c3039]">
              {rwaInfo.type === 'submit_batch' && (
                <>
                  <div className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                    <div className="text-white opacity-40">{t(`${historyKey}.dividendAmount`)}</div>
                    <div className="text-white">{rwaInfo.dividendAmount} {dividendSymbol}</div>
                  </div>
                  <div className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                    <div className="text-white opacity-40">{t(`${historyKey}.totalSupply`)}</div>
                    <div className="text-white">{rwaInfo.totalSupply} {rwaSymbol}</div>
                  </div>
                </>
              )}

              {rwaInfo.type === 'add_list' && rwaInfo.recipients && (
                <div>
                  <div className="h-[24px] text-[14px] leading-[24px] text-white opacity-40">
                    {t(`${historyKey}.dividendRecipients`)}
                  </div>
                  <div className="max-h-[120px] overflow-y-auto">
                    {rwaInfo.recipients.map((recipient: any, index: number) => (
                      <div key={index} className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                        <div className="text-white opacity-40">{formatAddress(recipient.address)}</div>
                        <div className="text-white">{recipient.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rwaInfo.type === 'claim_funds' && (
                <>
                  <div className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                    <div className="text-white opacity-40">{t(`${historyKey}.claimedAmount`)}</div>
                    <div className="text-white">{rwaInfo.claimedAmount} {dividendSymbol}</div>
                  </div>
                  <div className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                    <div className="text-white opacity-40">{t(`${historyKey}.recipient`)}</div>
                    <div className="text-white">{formatAddress(rwaInfo.recipient ?? '')}</div>
                  </div>
                </>
              )}

              {rwaInfo.type === 'buy_token' && (
                <>
                  <div className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                    <div className="text-white opacity-40">{t(`${historyKey}.buyAmount`)}</div>
                    <div className="text-white">{rwaInfo.buyAmount} {rwaSymbol}</div>
                  </div>
                  <div className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                    <div className="text-white opacity-40">{t(`${historyKey}.paidAmount`)}</div>
                    <div className="text-white">{rwaInfo.payAmount} {dividendSymbol}</div>
                  </div>
                  <div className="flex h-[24px] justify-between text-[14px] leading-[24px]">
                    <div className="text-white opacity-40">{t(`${historyKey}.price`)}</div>
                    <div className="text-white">{rwaInfo.price} {dividendSymbol}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </BaseBody>
      <BaseFooter>
        <button
          className="!mb-[46px] w-full h-[50px] rounded-[12px] bg-[#0047c4] !text-[18px] font-bold text-white hover:bg-[#3B82FF]"
          onClick={() => {
            window.open(txDetailExplorerURL, '_blank');
          }}
        >
          {t(`${historyKey}.viewOnExplorer`)}
        </button>
      </BaseFooter>
    </>
  );
}
