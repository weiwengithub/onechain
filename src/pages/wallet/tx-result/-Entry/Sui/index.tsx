import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter/index.tsx';
import Base1300Text from '@/components/common/Base1300Text/index.tsx';
import Button from '@/components/common/Button/index.tsx';
import TextButton from '@/components/common/TextButton/index.tsx';
import { TRASACTION_RECEIPT_ERROR_MESSAGE } from '@/constants/error.ts';
import { SUI_COIN_TYPE, TRANSACTION_RESULT } from '@/constants/sui/index.ts';
import { TX_CONFIRMED_STATUS } from '@/constants/txStatus.ts';
import { useTxInfo } from '@/hooks/sui/useTxInfo.ts';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets.ts';
// import { Route as Dashboard } from '@/pages';
import { Route as AddAddress } from '@/pages/general-setting/address-book/add-address';
import { getUniqueChainId, isMatchingCoinId } from '@/utils/queryParamGenerator.ts';
import { getShortAddress } from '@/utils/string';
import { getShortDate } from '@/utils/date';
import { FooterContainer } from './styled.tsx';

import SendImage from '@/assets/images/tx/send.png';
import LoadingIcon from '@/assets/img/icon/loading.png';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { toDisplayDenomAmount } from '@/utils/numbers.ts';
import { getSuiCoinType } from '@/onechain/utils';

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

interface BuyRwaTokenEvent {
  buy_amount: string;
  pay_amount: string;
  price: string;
  project_id: string;
  recipient: string;
  user: string;
}

type SuiProps = {
  coinId: string;
  txHash?: string;
  address?: string;
};

export default function Sui({ coinId, txHash, address }: SuiProps) {
  const { t } = useTranslation();
  const { getSuiAccountAsset } = useGetAccountAsset({ coinId });
  const navigate = useNavigate();

  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
  });

  const FEE_COIN_TYPE = getSuiCoinType(coinId);
  // const { data: accountAsset } = useAccountAllAssets();
  const selectedFeeAsset = accountAllAssets?.suiAccountAssets.find((item) => item.asset.id === FEE_COIN_TYPE)?.asset;
  const coinFeeSymbol = selectedFeeAsset?.symbol || '';

  const txInfo = useTxInfo({
    coinId,
    digest: txHash,
  });

  const { getSuiAccountAsset: getSuiAccountMainAsset } = useGetAccountAsset({ coinId: SUI_COIN_TYPE });
  const feeCoinAsset = getSuiAccountMainAsset()?.asset;
  const feeCoinDecimals = feeCoinAsset?.decimals || 9;

  const selectedAsset = accountAllAssets?.suiAccountAssets.find(({ asset }) => isMatchingCoinId(asset, coinId));
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

  const txConfirmedStatus = (() => {
    if (txInfo.error?.message === TRASACTION_RECEIPT_ERROR_MESSAGE.PENDING) return TX_CONFIRMED_STATUS.PENDING;

    if (txInfo.data?.result?.effects?.status.status) {
      if (txInfo.data.result.effects.status.status === TRANSACTION_RESULT.FAILURE) return TX_CONFIRMED_STATUS.FAILED;

      if (txInfo.data.result.effects.status.status === TRANSACTION_RESULT.SUCCESS) return TX_CONFIRMED_STATUS.CONFIRMED;
    }

    return undefined;
  })();

  const isTxConfirmed = txConfirmedStatus === TX_CONFIRMED_STATUS.CONFIRMED;
  // const isTxFailed = txConfirmedStatus === TX_CONFIRMED_STATUS.FAILED || !txHash || txInfo.error;

  const gas = useMemo(() => {
    if (txInfo.data?.result?.effects) {
      const storageCost = Number(txInfo.data.result.effects.gasUsed.storageCost);
      const nonRefundableStorageFee = Number(txInfo.data.result.effects.gasUsed.nonRefundableStorageFee);
      const gasFee = (storageCost + nonRefundableStorageFee);
      return toDisplayDenomAmount(gasFee, feeCoinDecimals);
    } else {
      return '-';
    }
  }, [txInfo]);

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

  const tempDisplay = false;

  const suiTxResultKey = 'pages.wallet.tx-result.entry.Sui.index';

  return (
    <>
      <BaseBody>
        <img src={SendImage} alt={t(`${suiTxResultKey}.imageAlt`)} className="mx-auto mt-[-14px] h-[100px]" />
        <div className="mt-[-14px] h-[40px] text-center text-[24px] leading-[40px] font-bold text-white">
          {isTxConfirmed ? t(`${suiTxResultKey}.titleSuccess`) : t(`${suiTxResultKey}.titleLoading`)}
        </div>
        {/*<div className="mt-1 h-[22px] text-center text-sm leading-[22px] opacity-60">*/}
        {/*  in only 0.91 secs*/}
        {/*</div>*/}
        <div className="relative mt-[24px] overflow-hidden rounded-[12px] bg-[#1E2025] pr-[10px] pl-[10px] pb-[12px]">
          {isTxConfirmed && (
            <>
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">{t(`${suiTxResultKey}.completedUtc`)}</div>
                <div>{txInfo.data?.result?.timestampMs ? getShortDate(Number(txInfo.data.result.timestampMs), 'MMM DD, YYYY HH:mm:ss') : '-'}</div>
              </div>
              {/*<div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">*/}
              {/*  <div className="text-white opacity-40">Send</div>*/}
              {/*  <div>0.005 SUI</div>*/}
              {/*</div>*/}
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">{t(`${suiTxResultKey}.to`)}</div>
                <div>{getShortAddress(address)}</div>
              </div>
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">{t(`${suiTxResultKey}.gas`)}</div>
                <div>
                  {gas} {coinFeeSymbol}
                </div>
              </div>

              {/* RWA Transaction Details */}
              {rwaInfo && (
                <div className="mt-[12px] pt-[12px] border-t border-[#2c3039]">
                  {rwaInfo.type === 'submit_batch' && (
                    <>
                      <div className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                        <div className="text-white opacity-40">{t(`${suiTxResultKey}.dividendAmount`)}</div>
                        <div>{rwaInfo.dividendAmount} {dividendSymbol}</div>
                      </div>
                      <div className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                        <div className="text-white opacity-40">{t(`${suiTxResultKey}.totalSupply`)}</div>
                        <div>{rwaInfo.totalSupply} {rwaSymbol}</div>
                      </div>
                    </>
                  )}

                  {rwaInfo.type === 'add_list' && rwaInfo.recipients && (
                    <div>
                      <div className="h-[24px] text-[14px] text-white leading-[24px] opacity-40">
                        {t(`${suiTxResultKey}.dividendRecipients`)}
                      </div>
                      <div className="max-h-[120px] overflow-y-auto">
                        {rwaInfo.recipients.map((recipient: any, index: number) => (
                          <div
                            key={index} className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]"
                          >
                            <div className="text-white opacity-40">{formatAddress(recipient.address)}</div>
                            <div>{recipient.percentage}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rwaInfo.type === 'claim_funds' && (
                    <>
                      <div className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                        <div className="text-white opacity-40">{t(`${suiTxResultKey}.claimedAmount`)}</div>
                        <div>{rwaInfo.claimedAmount} {dividendSymbol}</div>
                      </div>
                      <div className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                        <div className="text-white opacity-40">{t(`${suiTxResultKey}.recipient`)}</div>
                        <div>{formatAddress(rwaInfo.recipient ?? '')}</div>
                      </div>
                    </>
                  )}

                  {rwaInfo.type === 'buy_token' && (
                    <>
                      <div className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                        <div className="text-white opacity-40">{t(`${suiTxResultKey}.buyAmount`)}</div>
                        <div>{rwaInfo.buyAmount} {rwaSymbol}</div>
                      </div>
                      <div className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                        <div className="text-white opacity-40">{t(`${suiTxResultKey}.paidAmount`)}</div>
                        <div>{rwaInfo.payAmount} {dividendSymbol}</div>
                      </div>
                      <div className="flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                        <div className="text-white opacity-40">{t(`${suiTxResultKey}.price`)}</div>
                        <div>{rwaInfo.price} {dividendSymbol}</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {!isTxConfirmed && (
            <div className="mt-[68px] mb-[54px]">
              <img src={LoadingIcon} alt={t(`${suiTxResultKey}.loadingAlt`)} className="mx-auto size-[24px] animate-spin" />
              <div className="mt-[8px] h-[24px] text-center text-[14px] leading-[24px] text-white opacity-40">
                {t(`${suiTxResultKey}.loadingDetails`)}
              </div>
            </div>
          )}
        </div>
      </BaseBody>
      <BaseFooter>
        {tempDisplay && isTxConfirmed && address && (
          <FooterContainer>
            <Base1300Text variant="b3_R">{t('pages.wallet.tx-result.entry.addAddresstoBook')}</Base1300Text>
            <TextButton
              onClick={() => {
                navigate({
                  to: AddAddress.to,
                  search: {
                    address: address,
                    chainId: selectedAsset?.chain && getUniqueChainId(selectedAsset?.chain),
                  },
                });
              }}
              variant="hyperlink"
              typoVarient="b2_M"
            >
              {t('pages.wallet.tx-result.entry.addToAddress')}
            </TextButton>
          </FooterContainer>
        )}
        <Button
          disabled={!isTxConfirmed}
          onClick={() => {
            window.open(txDetailExplorerURL, '_blank');
            // navigate({
            //   to: Dashboard.to,
            //   replace: true,
            // });
          }}
        >
          {t('pages.wallet.tx-result.entry.viewOnExplorer')}
        </Button>
      </BaseFooter>
    </>
  );
}
