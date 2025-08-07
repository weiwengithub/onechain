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

  const tempDisplay = false;

  return (
    <>
      <BaseBody>
        <img src={SendImage} alt="send" className="mx-auto mt-[-14px] h-[100px]" />
        <div className="mt-[-14px] h-[40px] text-center text-[24px] leading-[40px] font-bold text-white">
          {isTxConfirmed ? 'Successfully send' : 'Loading details'}
        </div>
        {/*<div className="mt-1 h-[22px] text-center text-sm leading-[22px] opacity-60">*/}
        {/*  in only 0.91 secs*/}
        {/*</div>*/}
        <div className="relative mt-[24px] overflow-hidden rounded-[12px] bg-[#1E2025] pr-[10px] pl-[10px] pb-[12px]">
          {isTxConfirmed && (
            <>
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">Completed (UTC)</div>
                <div>{txInfo.data?.result?.timestampMs ? getShortDate(Number(txInfo.data.result.timestampMs), 'MMM DD, YYYY HH:mm:ss') : '-'}</div>
              </div>
              {/*<div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">*/}
              {/*  <div className="text-white opacity-40">Send</div>*/}
              {/*  <div>0.005 SUI</div>*/}
              {/*</div>*/}
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">To</div>
                <div>{getShortAddress(address)}</div>
              </div>
              <div className="mt-[12px] flex h-[24px] justify-between text-[14px] text-white leading-[24px]">
                <div className="text-white opacity-40">Gas</div>
                <div>
                  {gas} {coinFeeSymbol}
                </div>
              </div>
            </>
          )}
          {!isTxConfirmed && (
            <div className="mt-[68px] mb-[54px]">
              <img src={LoadingIcon} alt="loading" className="mx-auto size-[24px] animate-spin" />
              <div className="mt-[8px] h-[24px] text-center text-[14px] leading-[24px] text-white opacity-40">Loading
                details
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
