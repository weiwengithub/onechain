import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce, useDebouncedCallback } from 'use-debounce';
import { Transaction as TransactionOct, type Transaction as TransactionTypeOct } from '@onelabs/sui/transactions';
import { Transaction, type Transaction as TransactionType } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { useNavigate } from '@tanstack/react-router';

import AddressBottomSheet from '@/components/AddressBottomSheet/index.tsx';
import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import SuiFee from '@/components/Fee/SuiFee/index.tsx';
import { DEFAULT_GAS_BUDGET, DEFAULT_GAS_BUDGET_MULTIPLY } from '@/constants/sui/gas.ts';
import { useDryRunTransaction } from '@/hooks/sui/useDryRunTransaction.ts';
import { useGetCoins } from '@/hooks/sui/useGetCoins.ts';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { Route as TxConfirm } from '@/pages/wallet/tx-confirm';
import {
  formatDecimal,
  formatNumberWithSeparator,
  gt,
  isDecimal,
  minus,
  plus,
  times,
  toBaseDenomAmount,
  toDisplayDenomAmount,
} from '@/utils/numbers.ts';
import { getUniqueChainId } from '@/utils/queryParamGenerator.ts';
import { isEqualsIgnoringCase } from '@/utils/string.ts';
import { getCoinType } from '@/utils/sui/coin.ts';
import AutoResizeTextarea from '@/components/AutoResizeTextarea';
import ArrowRightIcon from '@/assets/img/icon/arrow_right_12.png';
import CurrencyBalanceIcon from '@/assets/img/icon/currency_balance.png';
import WarningIcon from '@/assets/img/icon/warning.png';

import TxProcessingOverlay from '../components/TxProcessingOverlay/index.tsx';
import { cn } from '@/utils/date.ts';
import { useOctPrice } from '@/onechain/useOctPrice.ts';
import { usePrice } from '@/onechain/usePrice.ts';
import { getSuiCoinType } from '@/onechain/utils';

// import AddressBookIcon from '@/assets/images/icons/AddressBook20.svg';

type TronProps = {
  coinId: string;
};

export default function Tron({ coinId }: TronProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const COIN_TYPE = getSuiCoinType(coinId);

  const isOct = coinId.includes('oct');

  // const { data: coinGeckoPrice } = useCoinGeckoPrice();

  const [isDisabled, setIsDisabled] = useState(false);
  const [isOpenTxProcessingOverlay] = useState(false);

  const { getSuiAccountAsset } = useGetAccountAsset({ coinId });

  const selectedCoinToSend = getSuiAccountAsset();

  const { getSuiAccountAsset: getSuiAccountMainAsset } = useGetAccountAsset({ coinId: COIN_TYPE });

  const feeCoinAsset = getSuiAccountMainAsset()?.asset;

  const feeCoinDecimals = feeCoinAsset?.decimals || 9;

  const address = selectedCoinToSend?.address.address || '';

  const coinImageURL = selectedCoinToSend?.asset.image || '';

  const coinSymbol = selectedCoinToSend?.asset.symbol || getCoinType(selectedCoinToSend?.asset.id || '');
  const coinDecimal = selectedCoinToSend?.asset.decimals || 0;

  // const coinGeckoId = selectedCoinToSend?.asset.coinGeckoId || '';
  // const coinPrice = (coinGeckoId && coinGeckoPrice?.[coinGeckoId]?.[userCurrencyPreference]) || 0;
  // const [coinPrice, setoinPrice] = useState<number>(0.1);
  // useEffect(() => {
  //   const getPrice = async ()=>{
  //     const res = await oneChainApi.getMarketPrice();
  //     if (res?.success && res.data) {
  //       setoinPrice(Number(res.data.price) ?? 0.1);
  //     }
  //   };
  //   getPrice();
  // }, []);

  // const {priceInfo} = useOctPrice();
  // const {octPrice:coinPrice} = priceInfo;
  const { getAccountAsset } = useGetAccountAsset({ coinId });
  const currentCoin = getAccountAsset();

  const coinGeckoId = currentCoin?.asset.coinGeckoId;
  const { chainPrice: coinPrice } = usePrice({ coinId, coinGeckoId });

  const baseAvailableAmount = selectedCoinToSend?.balance || '0';
  const displayAvailableAmount = toDisplayDenomAmount(baseAvailableAmount, coinDecimal);

  const [recipientAddress, setRecipientAddress] = useState('');
  const [sendDisplayAmount, setSendDisplayAmount] = useState('');

  const sendBaseAmount = sendDisplayAmount ? toBaseDenomAmount(sendDisplayAmount, coinDecimal) : '0';

  const displaySendAmountPrice = sendDisplayAmount ? times(sendDisplayAmount, coinPrice) : '0';

  const [isOpenAddressBottomSheet, setIsOpenAddressBottomSheet] = useState(false);

  const currentCoinType = selectedCoinToSend?.asset.id || '';

  const { data: ownedEqualCoins } = useGetCoins({ coinId, coinType: currentCoinType });

  const sendTx = useMemo<TransactionTypeOct | TransactionType | undefined>(() => {
    if (!gt(sendBaseAmount, '0') || !recipientAddress || !isValidSuiAddress(recipientAddress)) {
      return undefined;
    }
    const tx = isOct ? new TransactionOct() : new Transaction();

    tx.setSenderIfNotSet(address);

    const filteredOwnedEqualCoins =
      ownedEqualCoins
        ?.map((item) => item.result?.data)
        .filter((item) => !!item)
        .flat() || [];

    const [primaryCoin, ...mergeCoins] = filteredOwnedEqualCoins?.filter((coin) => coin.coinType === currentCoinType) || [];

    if (currentCoinType === COIN_TYPE) {
      // @ts-expect-error -- 1
      const [coin] = tx.splitCoins(tx.gas, [sendBaseAmount]);

      tx.transferObjects([coin], recipientAddress);
    } else if (primaryCoin) {
      const primaryCoinInput = tx.object(primaryCoin.coinObjectId);
      if (mergeCoins.length) {
        tx.mergeCoins(
          primaryCoinInput,
          mergeCoins.map((coin) => tx.object(coin.coinObjectId)),
        );
      }
      // @ts-expect-error -- 1
      const coin = tx.splitCoins(primaryCoinInput, [sendBaseAmount]);
      tx.transferObjects([coin], recipientAddress);
    }

    return tx;
  }, [COIN_TYPE, address, currentCoinType, isOct, ownedEqualCoins, recipientAddress, sendBaseAmount]);

  const [debouncedTx] = useDebounce(sendTx, 500);

  const {
    data: dryRunTransaction,
    error: dryRunTransactionError,
    isLoading: isDryRunTransactionLoading,
    isFetching: isDryRunTransactionFetching,
  } = useDryRunTransaction({
    coinId,
    // @ts-ignore
    transaction: debouncedTx,
  });

  console.log('      debouncedTx', debouncedTx, coinId);
  console.log('      dryRunTransaction', dryRunTransaction);

  const expectedBaseFeeAmount = (() => {
    if (dryRunTransaction?.result?.effects.status.status === 'success') {
      const storageCost = minus(dryRunTransaction.result.effects.gasUsed.storageCost, dryRunTransaction.result.effects.gasUsed.storageRebate);

      const cost = plus(dryRunTransaction.result.effects.gasUsed.computationCost, gt(storageCost, 0) ? storageCost : 0);

      const baseBudget = Number(times(cost, DEFAULT_GAS_BUDGET_MULTIPLY));

      return baseBudget;
    }

    return DEFAULT_GAS_BUDGET;
  })();

  const displayExpectedBaseFeeAmount = toDisplayDenomAmount(expectedBaseFeeAmount, feeCoinDecimals);

  const addressInputErrorMessage = (() => {
    if (recipientAddress && (!isValidSuiAddress(recipientAddress) || isEqualsIgnoringCase(recipientAddress, selectedCoinToSend?.address.address))) {
      return t('pages.wallet.send.$coinId.Entry.Sui.index.invalidAddress');
    }
    // if (recipientAddress && (!isValidSuiAddress(recipientAddress))) {
    //   return t('pages.wallet.send.$coinId.Entry.Sui.index.invalidAddress');
    // }
    return '';
  })();

  const sendAmountInputErrorMessage = (() => {
    if (sendDisplayAmount) {
      if (currentCoinType === COIN_TYPE) {
        const totalCostAmount = plus(sendDisplayAmount, displayExpectedBaseFeeAmount);

        if (gt(totalCostAmount, displayAvailableAmount)) {
          return t('pages.wallet.send.$coinId.Entry.Sui.index.insufficientAmount');
        }
      } else {
        if (gt(sendBaseAmount, baseAvailableAmount)) {
          return t('pages.wallet.send.$coinId.Entry.Sui.index.insufficientAmount');
        }
      }

      if (!gt(sendDisplayAmount, '0')) {
        return t('pages.wallet.send.$coinId.Entry.Sui.index.tooLowAmount');
      }
    }

    return '';
  })();

  const errorMessage = useMemo(() => {
    if (!recipientAddress) {
      return t('pages.wallet.send.$coinId.Entry.Sui.index.noRecipientAddress');
    }

    if (addressInputErrorMessage) {
      return addressInputErrorMessage;
    }

    if (!sendDisplayAmount) {
      return t('pages.wallet.send.$coinId.Entry.Sui.index.noAmount');
    }

    if (sendAmountInputErrorMessage) {
      return sendAmountInputErrorMessage;
    }

    if (gt(sendDisplayAmount || '0', displayAvailableAmount)) {
      return t('pages.wallet.send.$coinId.Entry.Sui.index.insufficientAmount');
    }
    if (dryRunTransactionError?.message) {
      const idx = dryRunTransactionError.message.lastIndexOf(':');

      return dryRunTransactionError.message.substring(idx === -1 ? 0 : idx + 1).trim();
    }

    if (dryRunTransaction?.result?.effects.status.error) {
      return dryRunTransaction?.result?.effects.status.error;
    }

    if (dryRunTransaction?.result?.effects.status.status !== 'success') {
      return t('pages.wallet.send.$coinId.Entry.Sui.index.failedToDryRun');
    }

    if (!debouncedTx) {
      return t('pages.wallet.send.$coinId.Entry.Sui.index.failedToBuildTransaction');
    }

    return '';
  }, [
    addressInputErrorMessage,
    debouncedTx,
    displayAvailableAmount,
    dryRunTransaction?.result?.effects.status.error,
    dryRunTransaction?.result?.effects.status.status,
    dryRunTransactionError?.message,
    recipientAddress,
    sendAmountInputErrorMessage,
    sendDisplayAmount,
    t,
  ]);

  const handleOnClickMax = () => {
    if (currentCoinType === COIN_TYPE) {
      const displayAmount = minus(displayAvailableAmount, displayExpectedBaseFeeAmount);
      setSendDisplayAmount(gt(displayAmount, '0') ? displayAmount : '0');
    } else {
      setSendDisplayAmount(displayAvailableAmount);
    }
  };

  const debouncedEnabled = useDebouncedCallback(() => {
    setTimeout(() => {
      setIsDisabled(false);
    }, 300);
  }, 300);

  useEffect(() => {
    setIsDisabled(true);

    debouncedEnabled();
  }, [debouncedEnabled, sendTx, isDryRunTransactionLoading, isDryRunTransactionFetching]);

  console.log('      errorMessage', errorMessage, isDisabled);

  return (
    <>
      <BaseBody>
        <>
          <div className="flex items-center justify-between">
            <div className="flex h-[28px] items-center rounded-[52px] bg-[#1E2025] p-[4px]">
              <img
                src={coinImageURL}
                alt={t('pages.wallet.send.$coinId.Entry.Sui.index.coinImageAlt')}
                className="size-[20px]"
              />
              <div className="ml-[4px] h-[18px] text-[14px] leading-[18px] text-white font-medium">{coinSymbol}</div>
              <img
                src={ArrowRightIcon}
                alt={t('pages.wallet.send.$coinId.Entry.Sui.index.selectAlt')}
                className="mr-[6px] ml-[8px] size-[12px] cursor-pointer"
              />
            </div>
            <div
              className="flex items-center"
              onClick={handleOnClickMax}
            >
              <img
                src={CurrencyBalanceIcon}
                alt={t('pages.wallet.send.$coinId.Entry.Sui.index.balanceAlt')}
                className="size-[12px]"
              />
              <div className="ml-[6px] h-[20px] text-[14px] leading-[20px] text-white font-medium opacity-60">
                {formatNumberWithSeparator(formatDecimal(toDisplayDenomAmount(baseAvailableAmount, coinDecimal)))}
              </div>
            </div>
          </div>
          <div className="/bg-blue-400 mt-[24px] overflow-hidden text-[32px] leading-[20px] font-bold">
            <input
              placeholder="0"
              className="/bg-yellow-400 flex h-full border-none text-[32px] text-white outline-none focus:outline-none"
              autoFocus
              value={sendDisplayAmount}
              onChange={(e) => {
                const oldValue = e.target.value;
                let newValue;

                if (coinDecimal === 0) {
                  // decimals为0时，只保留数字，不允许小数点
                  newValue = oldValue.replace(/[^\d]/g, '');
                } else {
                  // decimals大于0时，保留数字和小数点
                  newValue = oldValue.replace(/[^\d.]/g, '');
                  // 如果有多个小数点，只保留第一个
                  const firstDotIndex = newValue.indexOf('.');
                  if (firstDotIndex !== -1) {
                    const parts = newValue.split('.');
                    newValue = (parts[0] || 0) + '.' + parts.slice(1).join('').replace(/\./g, '');
                  }
                }

                // 根据token的decimals限制小数位数
                if (newValue === '' || isDecimal(newValue, coinDecimal)) {
                  setSendDisplayAmount(newValue);
                }
              }}
            />
          </div>
          <div
            className={cn('mt-[18px] h-[20px] text-[18px] leading-[20px] text-white font-medium', parseFloat(displaySendAmountPrice) > 0 ? '' : 'opacity-40')}
          >
            ${displaySendAmountPrice}
          </div>
          <div className="mt-[48px] h-[20px] text-[16px] leading-[20px] text-white font-medium">
            {t('pages.wallet.send.$coinId.Entry.Sui.index.toLabel')}
          </div>
          <div className="relative mt-[9px] rounded-[12px] pt-[100px]">
            <div className="absolute top-0 left-0 h-[100px] w-full rounded-[12px] bg-[#1E2025]">
              <div className="absolute top-[50%] right-[44px] left-[44px] transform-[translateY(-50%)]">
                <AutoResizeTextarea
                  value={recipientAddress}
                  onChange={(value) => setRecipientAddress(value)}
                  placeholder={t('pages.wallet.send.$coinId.Entry.Sui.index.recipientPlaceholder')}
                  maxHeight={72}
                />
              </div>
            </div>
            {addressInputErrorMessage && (
              <div className="mt-[-10px] h-[46px] bg-[#e04646] pt-[10px]">
                <div className="flex h-[36px] items-center">
                  <img
                    src={WarningIcon}
                    alt={t('pages.wallet.send.$coinId.Entry.Sui.index.warningAlt')}
                    className="ml-[16px] h-[16px]"
                  />
                  <div
                    className="ml-[8px] h-[22px] text-[14px] leading-[22px] opacity-80"
                  >{addressInputErrorMessage}</div>
                </div>
              </div>
            )}
          </div>
        </>
      </BaseBody>
      <BaseFooter>
        <>
          <SuiFee
            id={coinId}
            displayFeeAmount={displayExpectedBaseFeeAmount}
            disableConfirm={!!errorMessage || isDisabled}
            isLoading={isDisabled}
            onClickConfirm={() => {
              navigate({
                to: TxConfirm.to,
                search: {
                  coinId,
                  sendAmount: sendDisplayAmount,
                  sendAmountPrice: displaySendAmountPrice,
                  recipientAddress,
                  feeAmount: displayExpectedBaseFeeAmount,
                },
              });
            }}
          />
        </>
      </BaseFooter>
      {selectedCoinToSend?.chain && (
        <AddressBottomSheet
          open={isOpenAddressBottomSheet}
          onClose={() => setIsOpenAddressBottomSheet(false)}
          filterAddress={selectedCoinToSend?.address.address}
          chainId={getUniqueChainId(selectedCoinToSend.chain)}
          headerTitle={t('pages.wallet.send.$coinId.Entry.Sui.index.chooseRecipientAddress')}
          onClickAddress={(address) => {
            setRecipientAddress(address);
          }}
        />
      )}

      <TxProcessingOverlay
        open={isOpenTxProcessingOverlay}
        title={t('pages.wallet.send.$coinId.Entry.Sui.index.txProcessing')}
        message={t('pages.wallet.send.$coinId.Entry.Sui.index.txProcessingSub')}
      />
    </>
  );
}
