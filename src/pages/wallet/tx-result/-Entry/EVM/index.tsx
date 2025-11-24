import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import type { TransactionReceipt } from 'ethers';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter/index.tsx';
import Base1300Text from '@/components/common/Base1300Text/index.tsx';
import Button from '@/components/common/Button/index.tsx';
import TextButton from '@/components/common/TextButton/index.tsx';
import { TRASACTION_RECEIPT_ERROR_MESSAGE } from '@/constants/error.ts';
import { TRANSACTION_RESULT } from '@/constants/evm/tx.ts';
import { TX_CONFIRMED_STATUS } from '@/constants/txStatus.ts';
import { useTxInfo } from '@/hooks/evm/useTxInfo.ts';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets.ts';
import { Route as AddAddress } from '@/pages/general-setting/address-book/add-address';
import { getUniqueChainId, isMatchingUniqueChainId, parseCoinId } from '@/utils/queryParamGenerator.ts';
import { getShortAddress } from '@/utils/string';
import { toDisplayDenomAmount } from '@/utils/numbers.ts';
import { NATIVE_EVM_COIN_ADDRESS } from '@/constants/evm.ts';
import { ethersProvider } from '@/utils/ethereum/ethers.ts';
import { getShortDate } from '@/utils/date';
import SendImage from '@/assets/images/tx/send.png';
import LoadingIcon from '@/assets/img/icon/loading.png';
import { FooterContainer } from '../Sui/styled.tsx';

type EvmTxResultProps = {
  coinId: string;
  txHash?: string;
  address?: string;
};

export default function EVM({ coinId, txHash, address }: EvmTxResultProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getEVMAccountAsset } = useGetAccountAsset({ coinId });
  const selectedAsset = getEVMAccountAsset();

  const txInfo = useTxInfo({
    coinId,
    txHash,
  });

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

  const feeDecimals = nativeAccountAsset?.asset.decimals || 18;
  const feeSymbol = nativeAccountAsset?.asset.symbol || '';
  const rpcUrl = selectedAsset?.chain.rpcUrls?.[0]?.url;
  const [blockTimestampMs, setBlockTimestampMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchBlockTimestamp = async () => {
      if (!rpcUrl || !txInfo.data?.result?.blockNumber) {
        return;
      }

      try {
        const provider = ethersProvider(rpcUrl);
        const block = await provider.getBlock(txInfo.data.result.blockNumber);
        if (!cancelled && block?.timestamp) {
          setBlockTimestampMs(block.timestamp * 1000);
        }
      } catch {
        // ignore fetching errors; timestamp display will fallback to '-'
      }
    };

    fetchBlockTimestamp();

    return () => {
      cancelled = true;
    };
  }, [rpcUrl, txInfo.data?.result?.blockNumber]);

  const txExplorerUrl =
    selectedAsset?.chain.explorer?.tx && txHash
      ? selectedAsset.chain.explorer.tx.replace('${hash}', txHash)
      : selectedAsset?.chain.explorer?.url && txHash
        ? `${selectedAsset.chain.explorer.url}/tx/${txHash}`
        : '';

  const txConfirmedStatus = (() => {
    if (txInfo.error?.message === TRASACTION_RECEIPT_ERROR_MESSAGE.PENDING) return TX_CONFIRMED_STATUS.PENDING;

    if (txInfo.data?.result?.status) {
      if (BigInt(txInfo.data.result.status).toString(10) !== TRANSACTION_RESULT.SUCCESS) return TX_CONFIRMED_STATUS.FAILED;

      if (BigInt(txInfo.data.result.status).toString(10) === TRANSACTION_RESULT.SUCCESS) return TX_CONFIRMED_STATUS.CONFIRMED;
    }

    return undefined;
  })();

  const isTxConfirmed = txConfirmedStatus === TX_CONFIRMED_STATUS.CONFIRMED;
  const isTxFailed = txConfirmedStatus === TX_CONFIRMED_STATUS.FAILED || !txHash || txInfo.error;

  const gasFee = useMemo(() => {
    const receipt = txInfo.data?.result as (TransactionReceipt & { effectiveGasPrice?: string }) | undefined;
    const gasUsedRaw = receipt?.gasUsed?.toString();
    const gasPriceRaw = receipt?.effectiveGasPrice?.toString() ?? receipt?.gasPrice?.toString();

    if (gasUsedRaw && gasPriceRaw) {
      const total = (BigInt(gasUsedRaw) * BigInt(gasPriceRaw)).toString(10);
      return toDisplayDenomAmount(total, feeDecimals);
    }

    return '-';
  }, [feeDecimals, txInfo.data?.result]);

  const statusTitle = (() => {
    if (isTxFailed) return t('pages.wallet.tx-result.entry.txFailTitle');
    if (isTxConfirmed) return t('pages.wallet.tx-result.entry.txSuccessTitle');
    return t('pages.wallet.tx-result.entry.loadingDetails');
  })();
  const suiTxResultKey = 'pages.wallet.tx-result.entry.Sui.index';
  const completedDate = blockTimestampMs ? getShortDate(blockTimestampMs, 'MMM DD, YYYY HH:mm:ss') : '-';

  return (
    <>
      <BaseBody>
        <img
          src={SendImage}
          alt={t(`${suiTxResultKey}.imageAlt`)}
          className="mx-auto mt-[-14px] h-[100px]"
        />
        <div
          className="mt-[-14px] h-[40px] text-center text-[24px] leading-[40px] font-bold text-white"
        >{statusTitle}</div>
        <div className="relative mt-[24px] overflow-hidden rounded-[12px] bg-[#1E2025] pr-[10px] pl-[10px] pb-[12px]">
          {isTxConfirmed && (
            <>
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">{t(`${suiTxResultKey}.completedUtc`)}</div>
                <div>{completedDate}</div>
              </div>
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">{t(`${suiTxResultKey}.to`)}</div>
                <div>{address ? getShortAddress(address) : '-'}</div>
              </div>
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">{t(`${suiTxResultKey}.gas`)}</div>
                <div>
                  {gasFee} {feeSymbol}
                </div>
              </div>
            </>
          )}
          {!isTxConfirmed && (
            <div className="mt-[90px] mb-[54px]">
              <img
                src={LoadingIcon}
                alt={t(`${suiTxResultKey}.loadingAlt`)}
                className="mx-auto size-[24px] animate-spin"
              />
              <div className="mt-[8px] h-[24px] text-center text-[14px] leading-[24px] text-white opacity-40">
                {t(`${suiTxResultKey}.loadingDetails`)}
              </div>
            </div>
          )}
          {isTxFailed && (
            <div className="mt-[12px] h-[24px] text-center text-[14px] leading-[24px] text-[#ff7878]">
              {t('pages.wallet.tx-result.entry.txFailSubTitle')}
            </div>
          )}
        </div>
      </BaseBody>
      <BaseFooter>
        {/*{isTxConfirmed && address && (*/}
        {/*  <FooterContainer>*/}
        {/*    <Base1300Text variant="b3_R">{t('pages.wallet.tx-result.entry.addAddresstoBook')}</Base1300Text>*/}
        {/*    <TextButton*/}
        {/*      onClick={() => {*/}
        {/*        navigate({*/}
        {/*          to: AddAddress.to,*/}
        {/*          search: {*/}
        {/*            address,*/}
        {/*            chainId: selectedAsset?.chain && getUniqueChainId(selectedAsset?.chain),*/}
        {/*          },*/}
        {/*        });*/}
        {/*      }}*/}
        {/*      variant="hyperlink"*/}
        {/*      typoVarient="b2_M"*/}
        {/*    >*/}
        {/*      {t('pages.wallet.tx-result.entry.addToAddress')}*/}
        {/*    </TextButton>*/}
        {/*  </FooterContainer>*/}
        {/*)}*/}
        <Button
          disabled={!isTxConfirmed}
          onClick={() => {
            if (txExplorerUrl) {
              window.open(txExplorerUrl, '_blank');
            }
          }}
        >
          {t('pages.wallet.tx-result.entry.viewOnExplorer')}
        </Button>
      </BaseFooter>
    </>
  );
}
