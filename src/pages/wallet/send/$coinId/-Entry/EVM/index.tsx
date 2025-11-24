import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import { useDebounce, useDebouncedCallback } from 'use-debounce';
import { useNavigate } from '@tanstack/react-router';

import AddressBottomSheet from '@/components/AddressBottomSheet/index.tsx';
import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import type { BasicFeeOption, EIP1559FeeOption, FeeOption } from '@/components/Fee/EVMFee/components/FeeSettingBottomSheet/index.tsx';
import EVMFee from '@/components/Fee/EVMFee/index.tsx';
import AutoResizeTextarea from '@/components/AutoResizeTextarea';
import { NATIVE_EVM_COIN_ADDRESS } from '@/constants/evm.ts';
import { ERC20_ABI } from '@/constants/evm/abi.ts';
import { DEFAULT_GAS_MULTIPLY, EVM_DEFAULT_GAS } from '@/constants/evm/fee.ts';
import { useENS } from '@/hooks/evm/useENS.ts';
import { useEstimateGas } from '@/hooks/evm/useEstimateGas.ts';
import { useFee } from '@/hooks/evm/useFee.ts';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets.ts';
import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice.ts';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { Route as TxConfirm } from '@/pages/wallet/tx-confirm';
import { isTestnetChain } from '@/utils/chain.ts';
import { ethersProvider } from '@/utils/ethereum/ethers.ts';
import {
  ceil,
  formatDecimal,
  formatNumberWithSeparator,
  gt,
  minus,
  plus,
  times,
  toBaseDenomAmount,
  toDisplayDenomAmount,
} from '@/utils/numbers.ts';
import {
  getCoinId,
  getUniqueChainId,
  isMatchingUniqueChainId,
  parseCoinId,
} from '@/utils/queryParamGenerator.ts';
import { isDecimal, isEqualsIgnoringCase, toHex } from '@/utils/string.ts';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import { cn } from '@/utils/date.ts';

import AddressBookIcon from '@/assets/images/icons/AddressBook20.svg';
import ArrowRightIcon from '@/assets/img/icon/arrow_right_12.png';
import CurrencyBalanceIcon from '@/assets/img/icon/currency_balance.png';
import WarningIcon from '@/assets/img/icon/warning.png';

type EVMProps = {
  coinId: string;
};

export default function EVM({ coinId }: EVMProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { userCurrencyPreference } = useExtensionStorageStore((state) => state);
  const { data: coinGeckoPrice } = useCoinGeckoPrice();

  const [isDisabled, setIsDisabled] = useState(false);

  const [currentFeeStepKey, setCurrentFeeStepKey] = useState<number>(1);
  const [customGasAmount, setCustomGasAmount] = useState<string | undefined>();
  const [customGasPrice, setCustomGasPrice] = useState('');
  const [customMaxBaseFeeAmount, setCustomMaxBaseFeeAmount] = useState('');
  const [customPriorityFeeAmount, setCustomPriorityFeeAmount] = useState('');

  const [isOpenAddressBottomSheet, setIsOpenAddressBottomSheet] = useState(false);

  const { getEVMAccountAsset } = useGetAccountAsset({ coinId });

  const selectedCoinToSend = getEVMAccountAsset();
  const selectedChainId = (() => {
    const { chainId, chainType } = parseCoinId(coinId);

    return getUniqueChainId({
      id: chainId,
      chainType: chainType,
    });
  })();

  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
    disableDupeEthermint: true,
  });

  const nativeAccountAsset = useMemo(
    () =>
      [...(accountAllAssets?.evmAccountAssets || []), ...(accountAllAssets?.evmAccountCustomAssets || [])].find(
        (item) => isMatchingUniqueChainId(item.chain, selectedChainId) && item.asset.id === NATIVE_EVM_COIN_ADDRESS,
      ),
    [accountAllAssets?.evmAccountAssets, accountAllAssets?.evmAccountCustomAssets, selectedChainId],
  );
  const nativeAccountAssetCoinId = useMemo(() => (nativeAccountAsset ? getCoinId(nativeAccountAsset.asset) : ''), [nativeAccountAsset]);

  const coinImageURL = selectedCoinToSend?.asset.image || '';

  const coinSymbol = selectedCoinToSend?.asset.symbol
    ? selectedCoinToSend.asset.symbol + `${isTestnetChain(selectedCoinToSend.chain.id) ? ' (Testnet)' : ''}`
    : '';
  const coinDecimals = selectedCoinToSend?.asset.decimals || 0;

  const coinGeckoId = selectedCoinToSend?.asset.coinGeckoId || '';
  const coinPrice = (coinGeckoId && coinGeckoPrice?.[coinGeckoId]?.[userCurrencyPreference]) || 0;

  const baseAvailableAmount = selectedCoinToSend?.balance || '0';
  const displayAvailableAmount = useMemo(() => toDisplayDenomAmount(baseAvailableAmount, coinDecimals), [baseAvailableAmount, coinDecimals]);

  const [inputRecipientAddress, setInputRecipientAddress] = useState('');
  const [debouncedInputRecipientAddress] = useDebounce(inputRecipientAddress, 500);

  const ens = useENS({ coinId, domain: debouncedInputRecipientAddress });

  const nameResolvedAddress = ens.data;
  const recipientAddress = useMemo(() => nameResolvedAddress || debouncedInputRecipientAddress, [debouncedInputRecipientAddress, nameResolvedAddress]);

  const [sendDisplayAmount, setSendDisplayAmount] = useState('');

  const displaySendAmountPrice = useMemo(() => (sendDisplayAmount ? times(sendDisplayAmount, coinPrice) : '0'), [coinPrice, sendDisplayAmount]);

  const baseSendAmount = useMemo(() => toBaseDenomAmount(sendDisplayAmount || '0', coinDecimals), [coinDecimals, sendDisplayAmount]);

  const sendTx = useMemo(() => {
    if (!gt(sendDisplayAmount || '0', '0') || !recipientAddress) return undefined;

    const amount = toHex(toBaseDenomAmount(sendDisplayAmount || '0', coinDecimals), {
      addPrefix: true,
      isStringNumber: true,
    });

    const senderAddress = selectedCoinToSend?.address.address || '';

    if (selectedCoinToSend?.asset.type !== 'erc20') {
      return {
        from: senderAddress,
        to: recipientAddress,
        value: amount,
      };
    }
    const rpcURLs = selectedCoinToSend?.chain.rpcUrls.map((item) => item.url) || [];

    const provider = ethersProvider(rpcURLs[0]);

    const tokenAddress = selectedCoinToSend?.asset.id;

    const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const data = isValidAddress(recipientAddress) ? erc20Contract.interface.encodeFunctionData('transfer', [recipientAddress, amount]) : undefined;

    return {
      from: senderAddress,
      to: tokenAddress,
      data,
    };
  }, [
    coinDecimals,
    recipientAddress,
    selectedCoinToSend?.address.address,
    selectedCoinToSend?.asset.id,
    selectedCoinToSend?.asset.type,
    selectedCoinToSend?.chain.rpcUrls,
    sendDisplayAmount,
  ]);
  const [debouncedSendTx] = useDebounce(sendTx, 500);

  const fee = useFee({ coinId });

  const estimateGas = useEstimateGas({
    coinId: nativeAccountAssetCoinId,
    bodyParams: debouncedSendTx && [debouncedSendTx],
  });

  const alternativeGas = useMemo(() => {
    const gasCoefficient = nativeAccountAsset?.chain.feeInfo.gasCoefficient || DEFAULT_GAS_MULTIPLY;

    const baseEstimateGas = times(BigInt(estimateGas.data?.result || EVM_DEFAULT_GAS).toString(10), gasCoefficient);

    return ceil(baseEstimateGas);
  }, [estimateGas.data?.result, nativeAccountAsset?.chain.feeInfo.gasCoefficient]);

  const feeOptions = useMemo(() => {
    const defaultFeeOption = {
      coinId: nativeAccountAsset?.asset ? getCoinId(nativeAccountAsset.asset) : '',
      decimals: nativeAccountAsset?.asset.decimals || 0,
      denom: nativeAccountAsset?.asset.id,
      coinGeckoId: nativeAccountAsset?.asset.coinGeckoId,
      symbol: nativeAccountAsset?.asset.symbol || '',
    };

    const customOption = (() => {
      if (fee.type === 'BASIC') {
        return {
          ...defaultFeeOption,
          type: 'BASIC',
          gas: customGasAmount,
          gasPrice: customGasPrice,
          title: 'Custom',
        } as BasicFeeOption;
      }

      if (fee.type === 'EIP-1559') {
        return {
          ...defaultFeeOption,
          type: 'EIP-1559',
          gas: customGasAmount,
          maxBaseFeePerGas: customMaxBaseFeeAmount,
          maxPriorityFeePerGas: customPriorityFeeAmount,
          title: 'Custom',
        } as EIP1559FeeOption;
      }
    })();

    const alternativeFeeOptions = (() => {
      const feeStepNames = ['Low', 'Average', 'High'];

      if (fee.type === 'BASIC') {
        const baseGasPrice = fee.currentGasPrice || '0';

        const gasPrices = [baseGasPrice, times(baseGasPrice, '1.2'), times(baseGasPrice, '2')];

        return gasPrices.map(
          (item, i) =>
            ({
              ...defaultFeeOption,
              type: 'BASIC',
              gas: alternativeGas,
              gasPrice: item,
              title: feeStepNames[i] || 'Fee',
            }) as BasicFeeOption,
        );
      }

      if (fee.type === 'EIP-1559') {
        const eipFeeList = fee.currentFee || [];

        return eipFeeList.map(
          (item, i) =>
            ({
              ...defaultFeeOption,
              type: 'EIP-1559',
              gas: alternativeGas,
              maxBaseFeePerGas: item.maxBaseFeePerGas,
              maxPriorityFeePerGas: item.maxPriorityFeePerGas,
              title: feeStepNames[i] || 'Fee',
            }) as EIP1559FeeOption,
        );
      }

      return [];
    })();

    return [...alternativeFeeOptions, customOption].filter((item) => !!item);
  }, [
    alternativeGas,
    customGasAmount,
    customGasPrice,
    customMaxBaseFeeAmount,
    customPriorityFeeAmount,
    fee.currentFee,
    fee.currentGasPrice,
    fee.type,
    nativeAccountAsset?.asset,
  ]);

  const currentFeeOption = useMemo<FeeOption | undefined>(() => feeOptions[currentFeeStepKey], [feeOptions, currentFeeStepKey]);

  const estimatedFeeBaseAmount = useMemo(() => {
    if (currentFeeOption?.type === 'BASIC') {
      return times(currentFeeOption?.gas || '0', currentFeeOption?.gasPrice || '0', 0);
    }
    if (currentFeeOption?.type === 'EIP-1559') {
      return times(currentFeeOption?.gas || '0', currentFeeOption.maxBaseFeePerGas || '0', 0);
    }

    return '0';
  }, [currentFeeOption]);

  const displayFeeAmount = useMemo(() => {
    if (!currentFeeOption) {
      return '0';
    }

    return toDisplayDenomAmount(estimatedFeeBaseAmount, currentFeeOption.decimals || 0);
  }, [currentFeeOption, estimatedFeeBaseAmount]);

  const addressInputErrorMessage = useMemo(() => {
    if (recipientAddress) {
      if (
        (recipientAddress.startsWith('0x') && !isValidAddress(recipientAddress)) ||
        isEqualsIgnoringCase(recipientAddress, selectedCoinToSend?.address.address)
      ) {
        return t('pages.wallet.send.$coinId.Entry.EVM.index.invalidAddress');
      }

      if (recipientAddress.endsWith('.eth') && !nameResolvedAddress && !ens.isLoading) {
        return t('pages.wallet.send.$coinId.Entry.EVM.index.invalidENSAddress');
      }

      if (!recipientAddress.endsWith('.eth') && !recipientAddress.startsWith('0x')) {
        return t('pages.wallet.send.$coinId.Entry.EVM.index.invalidENSFormat');
      }
    }

    return '';
  }, [ens.isLoading, nameResolvedAddress, recipientAddress, selectedCoinToSend?.address.address, t]);

  const sendAmountInputErrorMessage = useMemo(() => {
    if (sendDisplayAmount) {
      if (isEqualsIgnoringCase(selectedCoinToSend?.asset.id, NATIVE_EVM_COIN_ADDRESS)) {
        const totalCostAmount = plus(baseSendAmount, estimatedFeeBaseAmount);

        if (gt(totalCostAmount, baseAvailableAmount)) {
          return t('pages.wallet.send.$coinId.Entry.EVM.index.insufficientAmount');
        }
      } else {
        if (gt(baseSendAmount, baseAvailableAmount)) {
          return t('pages.wallet.send.$coinId.Entry.EVM.index.insufficientAmount');
        }
      }

      if (!gt(sendDisplayAmount, '0')) {
        return t('pages.wallet.send.$coinId.Entry.EVM.index.tooLowAmount');
      }
    }

    return '';
  }, [baseAvailableAmount, baseSendAmount, estimatedFeeBaseAmount, selectedCoinToSend?.asset.id, sendDisplayAmount, t]);

  const errorMessage = useMemo(() => {
    if (selectedCoinToSend?.chain.isDiableSend) {
      return t('pages.wallet.send.$coinId.Entry.EVM.index.bankLocked');
    }

    if (addressInputErrorMessage) {
      return addressInputErrorMessage;
    }

    if (!recipientAddress) {
      return t('pages.wallet.send.$coinId.Entry.EVM.index.noRecipientAddress');
    }

    if (baseAvailableAmount === '0') {
      return t('pages.wallet.send.$coinId.Entry.EVM.index.noAvailableAmount');
    }

    if (!sendDisplayAmount) {
      return t('pages.wallet.send.$coinId.Entry.EVM.index.noAmount');
    }

    if (sendAmountInputErrorMessage) {
      return sendAmountInputErrorMessage;
    }

    if (!sendTx) {
      return t('pages.wallet.send.$coinId.Entry.EVM.index.noTransaction');
    }

    return '';
  }, [
    addressInputErrorMessage,
    baseAvailableAmount,
    recipientAddress,
    selectedCoinToSend?.chain.isDiableSend,
    sendAmountInputErrorMessage,
    sendDisplayAmount,
    sendTx,
    t,
  ]);

  const handleOnClickMax = () => {
    if (selectedCoinToSend?.asset.type !== 'erc20') {
      const maxAmount = minus(baseAvailableAmount, estimatedFeeBaseAmount);

      setSendDisplayAmount(gt(maxAmount, '0') ? toDisplayDenomAmount(maxAmount, coinDecimals) : '0');
    } else {
      setSendDisplayAmount(displayAvailableAmount);
    }
  };

  const debouncedEnabled = useDebouncedCallback(() => {
    setTimeout(() => {
      setIsDisabled(false);
    }, 700);
  }, 700);

  useEffect(() => {
    setIsDisabled(true);

    debouncedEnabled();
  }, [debouncedEnabled, sendTx, estimateGas.isFetching]);

  return (
    <>
      <BaseBody>
        <>
          <div className="flex items-center justify-between">
            <div className="flex h-[28px] items-center rounded-[52px] bg-[#1E2025] p-[4px]">
              {coinImageURL && (
                <img
                  src={coinImageURL}
                  alt={t('pages.wallet.send.$coinId.Entry.Sui.index.coinImageAlt')}
                  className="size-[20px]"
                />
              )}
              <div className="ml-[4px] h-[18px] text-[14px] leading-[18px] text-white font-medium">
                {coinSymbol}
              </div>
              <img
                src={ArrowRightIcon}
                alt={t('pages.wallet.send.$coinId.Entry.Sui.index.selectAlt')}
                className="mr-[6px] ml-[8px] size-[12px]"
              />
            </div>
            <div
              className="flex items-center cursor-pointer"
              onClick={handleOnClickMax}
            >
              <img
                src={CurrencyBalanceIcon}
                alt={t('pages.wallet.send.$coinId.Entry.Sui.index.balanceAlt')}
                className="size-[12px]"
              />
              <div className="ml-[6px] h-[20px] text-[14px] leading-[20px] text-white font-medium opacity-60">
                {formatNumberWithSeparator(formatDecimal(toDisplayDenomAmount(baseAvailableAmount, coinDecimals)))}
              </div>
            </div>
          </div>
          <div className="mt-[24px] overflow-hidden text-[32px] leading-[20px] font-bold">
            <input
              placeholder="0"
              className="flex h-full border-none bg-transparent text-[32px] text-white outline-none focus:outline-none"
              autoFocus
              value={sendDisplayAmount}
              onChange={(e) => {
                const oldValue = e.target.value;
                let newValue;

                if ((coinDecimals || 0) === 0) {
                  newValue = oldValue.replace(/[^\d]/g, '');
                } else {
                  newValue = oldValue.replace(/[^\d.]/g, '');
                  const firstDotIndex = newValue.indexOf('.');
                  if (firstDotIndex !== -1) {
                    const parts = newValue.split('.');
                    newValue = (parts[0] || 0) + '.' + parts.slice(1).join('').replace(/\./g, '');
                  }
                }

                if (newValue === '' || isDecimal(newValue, coinDecimals || 0)) {
                  setSendDisplayAmount(newValue);
                }
              }}
            />
          </div>
          <div
            className={cn(
              'mt-[18px] h-[20px] text-[18px] leading-[20px] text-white font-medium',
              parseFloat(displaySendAmountPrice) > 0 ? '' : 'opacity-40',
            )}
          >
            ${displaySendAmountPrice}
          </div>
          <div className="mt-[48px] h-[20px] text-[16px] leading-[20px] text-white font-medium">
            {t('pages.wallet.send.$coinId.Entry.Sui.index.toLabel')}
          </div>
          <div className="relative mt-[9px] rounded-[12px] pt-[100px]">
            <div className="absolute inset-0 h-[100px] w-full rounded-[12px] bg-[#1E2025]">
              <div className="absolute top-1/2 right-[44px] left-[44px] -translate-y-1/2">
                <AutoResizeTextarea
                  value={inputRecipientAddress}
                  onChange={(value) => setInputRecipientAddress(value)}
                  placeholder={t('pages.wallet.send.$coinId.Entry.Sui.index.recipientPlaceholder')}
                  maxHeight={72}
                />
              </div>
              {/*<button*/}
              {/*  type="button"*/}
              {/*  className="absolute top-[12px] right-[12px] flex size-[32px] items-center justify-center rounded-full bg-white/5 hover:bg-white/10"*/}
              {/*  onClick={() => setIsOpenAddressBottomSheet(true)}*/}
              {/*>*/}
              {/*  <AddressBookIcon />*/}
              {/*</button>*/}
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
            {!addressInputErrorMessage && nameResolvedAddress && !ens.isLoading && (
              <div className="mt-2 px-2 text-[14px] leading-[20px] text-white/60">
                {nameResolvedAddress}
              </div>
            )}
          </div>
        </>
      </BaseBody>
      <BaseFooter>
        <div className="pt-4">
          <EVMFee
            feeOptionDatas={feeOptions}
            currentSelectedFeeOptionKey={currentFeeStepKey}
            errorMessage={errorMessage}
            onChangeGas={(gas) => {
              setCustomGasAmount(gas);
            }}
            onChangeGasPrice={(gasPrice) => {
              setCustomGasPrice(gasPrice);
            }}
            onChangeMaxBaseFee={(maxBaseFee) => {
              setCustomMaxBaseFeeAmount(maxBaseFee);
            }}
            onChangePriorityFee={(priorityFee) => {
              setCustomPriorityFeeAmount(priorityFee);
            }}
            onClickFeeStep={(val) => {
              setCurrentFeeStepKey(val);
            }}
            onClickConfirm={() => {
              if (
                !selectedCoinToSend ||
                !currentFeeOption ||
                !sendDisplayAmount ||
                !recipientAddress ||
                !currentFeeOption.gas ||
                !sendTx
              ) {
                return;
              }

              navigate({
                to: TxConfirm.to,
                search: {
                  coinId,
                  sendAmount: sendDisplayAmount,
                  sendAmountPrice: displaySendAmountPrice,
                  recipientAddress,
                  feeAmount: displayFeeAmount,
                  feeType: currentFeeOption.type === 'EIP-1559' ? 'EIP-1559' : 'BASIC',
                  gas: currentFeeOption.gas,
                  gasPrice: currentFeeOption.type === 'BASIC' ? currentFeeOption.gasPrice : undefined,
                  maxBaseFeePerGas: currentFeeOption.type === 'EIP-1559' ? currentFeeOption.maxBaseFeePerGas : undefined,
                  maxPriorityFeePerGas: currentFeeOption.type === 'EIP-1559' ? currentFeeOption.maxPriorityFeePerGas : undefined,
                },
              });
            }}
            disableConfirm={isDisabled || !!errorMessage}
            isLoading={isDisabled}
          />
        </div>
      </BaseFooter>

      {selectedCoinToSend?.chain && (
        <AddressBottomSheet
          open={isOpenAddressBottomSheet}
          onClose={() => setIsOpenAddressBottomSheet(false)}
          filterAddress={selectedCoinToSend?.address.address}
          chainId={getUniqueChainId(selectedCoinToSend.chain)}
          headerTitle={t('pages.wallet.send.$coinId.Entry.EVM.index.chooseRecipientAddress')}
          onClickAddress={(address) => {
            setInputRecipientAddress(address);
          }}
        />
      )}
    </>
  );
}
