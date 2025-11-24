import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ethers } from 'ethers';
import { isValidAddress } from 'ethereumjs-util';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter/index.tsx';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets.ts';
import { NATIVE_EVM_COIN_ADDRESS } from '@/constants/evm.ts';
import {
  getUniqueChainId,
  getUniqueChainIdWithManual,
  isMatchingUniqueChainId,
  parseCoinId,
} from '@/utils/queryParamGenerator.ts';
import { useTxTrackerStore } from '@/zustand/hooks/useTxTrackerStore.ts';
import { useCurrentAccount } from '@/hooks/useCurrentAccount.ts';
import { useCurrentPassword } from '@/hooks/useCurrentPassword.ts';
import { getKeypair } from '@/libs/address.ts';
import { signAndExecuteTxSequentially } from '@/utils/ethereum/sign.ts';
import { Route as TxResult } from '@/pages/wallet/tx-result';
import { getShortAddress, toHex } from '@/utils/string';
import { useClipboard } from '@/hooks/useClipboard';
import { ethersProvider } from '@/utils/ethereum/ethers.ts';
import { ERC20_ABI } from '@/constants/evm/abi.ts';
import { gt, toBaseDenomAmount } from '@/utils/numbers.ts';

import sendConfirmImage from '@/assets/images/etc/sendConfirm.png';
import CopyIcon from '@/assets/img/icon/copy_primary.png';

type EvmTxConfirmProps = {
  coinId: string;
  sendAmount?: string;
  sendAmountPrice?: string;
  recipientAddress?: string;
  feeAmount?: string;
  feeType?: 'BASIC' | 'EIP-1559';
  gas?: string;
  gasPrice?: string;
  maxBaseFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export default function EVM({
                              coinId,
                              sendAmount,
                              sendAmountPrice,
                              recipientAddress,
                              feeAmount,
                              feeType,
                              gas,
                              gasPrice,
                              maxBaseFeePerGas,
                              maxPriorityFeePerGas,
                            }: EvmTxConfirmProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { history } = useRouter();
  const { copyToClipboard } = useClipboard();
  const { addTx } = useTxTrackerStore();
  const { currentAccount } = useCurrentAccount();
  const { currentPassword } = useCurrentPassword();
  const [isProcessing, setIsProcessing] = useState(false);

  const { getEVMAccountAsset } = useGetAccountAsset({ coinId });
  const selectedCoinToSend = getEVMAccountAsset();

  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
    disableDupeEthermint: true,
  });

  const selectedChainId = useMemo(() => {
    const { chainId, chainType } = parseCoinId(coinId);

    return getUniqueChainId({
      id: chainId,
      chainType,
    });
  }, [coinId]);

  const nativeAccountAsset = useMemo(
    () =>
      [...(accountAllAssets?.evmAccountAssets || []), ...(accountAllAssets?.evmAccountCustomAssets || [])].find(
        (item) => isMatchingUniqueChainId(item.chain, selectedChainId) && item.asset.id === NATIVE_EVM_COIN_ADDRESS,
      ),
    [accountAllAssets?.evmAccountAssets, accountAllAssets?.evmAccountCustomAssets, selectedChainId],
  );

  const coinSymbol = selectedCoinToSend?.asset.symbol || '';
  const coinDecimals = selectedCoinToSend?.asset.decimals || 0;
  const senderAddress = selectedCoinToSend?.address.address || '';

  const feeCoinSymbol = nativeAccountAsset?.asset.symbol || '';
  const feeCoinImage = nativeAccountAsset?.asset.image || '';

  const amountDisplay = sendAmount || '0';
  const formattedApprox = sendAmountPrice ? t('pages.wallet.tx-confirm.entry.Sui.index.approxAmount', { amount: sendAmountPrice }) : '';
  const finalRecipient = recipientAddress || '';

  const sendTransaction = useMemo(() => {
    if (!selectedCoinToSend || !finalRecipient || !sendAmount || !gt(sendAmount, '0')) {
      return null;
    }

    const amountHex = toHex(toBaseDenomAmount(sendAmount, coinDecimals), {
      addPrefix: true,
      isStringNumber: true,
    });

    if (selectedCoinToSend.asset.type !== 'erc20') {
      return {
        from: senderAddress,
        to: finalRecipient,
        value: amountHex,
      };
    }

    const rpcURLs = selectedCoinToSend.chain.rpcUrls.map((item) => item.url) || [];
    const provider = ethersProvider(rpcURLs[0]);
    const tokenAddress = selectedCoinToSend.asset.id;
    const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const data = isValidAddress(finalRecipient)
      ? erc20Contract.interface.encodeFunctionData('transfer', [finalRecipient, amountHex])
      : undefined;

    return {
      from: senderAddress,
      to: tokenAddress,
      data,
      value: '0x0',
    };
  }, [coinDecimals, finalRecipient, selectedCoinToSend, sendAmount, senderAddress]);

  const finalizedTransaction = useMemo(() => {
    if (!sendTransaction || !selectedCoinToSend || !feeType || !gas) {
      return null;
    }

    if (feeType === 'BASIC' && !gasPrice) {
      return null;
    }

    if (feeType === 'EIP-1559' && (!maxBaseFeePerGas || !maxPriorityFeePerGas)) {
      return null;
    }

    return {
      from: sendTransaction.from,
      to: sendTransaction.to,
      data: sendTransaction.data,
      value: BigInt(sendTransaction.value || '0').toString(10),
      gasLimit: gas,
      chainId: BigInt(selectedCoinToSend.chain.chainId).toString(10),
      type: feeType === 'EIP-1559' ? 2 : undefined,
      gasPrice: feeType === 'BASIC' ? gasPrice : undefined,
      maxFeePerGas: feeType === 'EIP-1559' ? maxBaseFeePerGas : undefined,
      maxPriorityFeePerGas: feeType === 'EIP-1559' ? maxPriorityFeePerGas : undefined,
    };
  }, [feeType, gas, gasPrice, maxBaseFeePerGas, maxPriorityFeePerGas, selectedCoinToSend, sendTransaction]);

  const isConfirmDisabled = !finalizedTransaction || !finalRecipient || isProcessing;

  const handleOnClickConfirm = async () => {
    if (!selectedCoinToSend?.chain || !finalizedTransaction) {
      return;
    }

    try {
      setIsProcessing(true);

      const keyPair = getKeypair(selectedCoinToSend.chain, currentAccount, currentPassword);
      const privateKey = keyPair.privateKey;
      const rpcURLs = selectedCoinToSend.chain.rpcUrls.map((item) => item.url) || [];

      if (!rpcURLs.length) {
        throw new Error('RPC URLs not found');
      }

      const response = await signAndExecuteTxSequentially(privateKey, finalizedTransaction, rpcURLs);

      if (!response) {
        throw new Error('Failed to send transaction');
      }

      const { chainId, chainType } = parseCoinId(coinId);
      const uniqueChainId = getUniqueChainIdWithManual(chainId, chainType);

      addTx({
        txHash: response.hash,
        chainId: uniqueChainId,
        address: selectedCoinToSend.address.address,
        addedAt: Date.now(),
        retryCount: 0,
      });

      navigate({
        to: TxResult.to,
        search: {
          address: finalRecipient,
          coinId,
          txHash: response.hash,
        },
      });
    } catch {
      navigate({
        to: TxResult.to,
        search: {
          coinId,
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <BaseBody>
        <img
          src={sendConfirmImage} alt={t('pages.wallet.tx-confirm.entry.Sui.index.imageAlt')}
          className="mx-auto mt-[-14px] h-[100px]"
        />
        <div className="mt-[-14px] h-[24px] text-center text-[18px] leading-[24px] font-bold text-white">
          {t('pages.wallet.tx-confirm.entry.Sui.index.title')}
        </div>
        <div className="mt-[4px] h-[24px] text-center text-[24px] leading-[24px] font-bold text-white">
          -{amountDisplay} {coinSymbol}
        </div>
        <div
          className="mt-[25px] h-[24px] text-center text-[14px] leading-[24px] text-white opacity-40"
        >{formattedApprox}</div>
        <div className="relative mt-[24px] h-[118px] overflow-hidden rounded-[12px] bg-[#1e2025] pr-[12px] pl-[12px]">
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t('pages.wallet.tx-confirm.entry.Sui.index.gasFee')}</div>
            <div className="flex items-center text-white">
              {feeCoinImage && <img src={feeCoinImage} alt="fee" className="mr-[4px] size-[20px]" />}
              <span>
                {feeAmount || '-'} {feeCoinSymbol}
              </span>
            </div>
          </div>
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t('pages.wallet.tx-confirm.entry.Sui.index.from')}</div>
            <div className="flex items-center text-white">
              <span>{getShortAddress(senderAddress)}</span>
              <img
                src={CopyIcon}
                alt={t('pages.wallet.tx-confirm.entry.Sui.index.copyAlt')}
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => copyToClipboard(senderAddress)}
              />
            </div>
          </div>
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="text-white opacity-40">{t('pages.wallet.tx-confirm.entry.Sui.index.to')}</div>
            <div className="flex items-center text-white">
              <span>{finalRecipient ? getShortAddress(finalRecipient) : '-'}</span>
              <img
                src={CopyIcon}
                alt={t('pages.wallet.tx-confirm.entry.Sui.index.copyAlt')}
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => copyToClipboard(finalRecipient)}
              />
            </div>
          </div>
        </div>
      </BaseBody>
      <BaseFooter>
        <div className="mt-[8px] mb-[46px] flex">
          <button
            className="w-[110px] h-[50px] rounded-[12px] bg-[#1e2025] !text-[18px] font-bold text-white hover:bg-[#2C3039]"
            onClick={() => history.back()}
          >
            {t('pages.wallet.tx-confirm.entry.cancel')}
          </button>
          <button
            className="!ml-3 w-[190px] h-[50px] rounded-[12px] bg-[#0047c4] !text-[18px] font-bold text-white hover:bg-[#3B82FF] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isConfirmDisabled}
            onClick={handleOnClickConfirm}
          >
            {t('pages.wallet.tx-confirm.entry.confirm')}
          </button>
        </div>
      </BaseFooter>
    </>
  );
}
