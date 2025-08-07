import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { NATIVE_EVM_COIN_ADDRESS } from '@/constants/evm';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset';
import { isEqualsIgnoringCase } from '@/utils/string';

import type { ShortAddressCopyButtonProps } from '../ShortAddressCopyButton';
import Avatar from "boring-avatars";

import { useCurrentAccount } from '@/hooks/useCurrentAccount.ts';
import { Route as SwithAccount } from '@/pages/manage-account/switch-account';
import copy from 'copy-to-clipboard';
import { toastDefault, toastError } from '@/utils/toast.tsx';
import { getShortAddress } from '@/utils/string';
import { useTranslation } from 'react-i18next';
import CopyIcon from "@/assets/img/icon/wallet_home_copy.png";
import ArrowDownIcon from "@/assets/img/icon/arrow_down.png";

type AddressActionButtonsProps = Omit<ShortAddressCopyButtonProps, 'children'> & {
  coinId: string;
};

export default function AddressActionButtons({ coinId }: AddressActionButtonsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentAccount } = useCurrentAccount();

  const [isShowCosmosStyleAddress] = useState(false);

  const { getAccountAsset } = useGetAccountAsset({ coinId });

  const { data: currentAccountAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
    disableDupeEthermint: true,
  });

  const currentCoin = getAccountAsset();

  const cosmosStyleCoin = useMemo(() => {
    const isEthermint = currentCoin?.chain.chainType === 'evm' && currentCoin.chain.isCosmos;

    const isMainCoin = isEqualsIgnoringCase(currentCoin?.asset.id, NATIVE_EVM_COIN_ADDRESS);

    if (isEthermint && isMainCoin) {
      return currentAccountAssets?.cosmosAccountAssets.find(
        (item) =>
          isEqualsIgnoringCase(item.asset.id, currentCoin.chain.mainAssetDenom || '') &&
          item.chain.id === currentCoin.chain.id &&
          item.address.chainId === currentCoin.address.chainId &&
          item.address.accountType.hdPath === currentCoin.address.accountType.hdPath,
      );
    }

    return undefined;
  }, [currentAccountAssets?.cosmosAccountAssets, currentCoin]);

  const address = isShowCosmosStyleAddress ? cosmosStyleCoin?.address.address || '' : currentCoin?.address.address || '';

  const copyToClipboard = () => {
    if (copy(address)) {
      toastDefault(t('components.MainBox.CoinDetailBox.index.copied'));
    } else {
      toastError(t('components.MainBox.CoinDetailBox.index.copyFailed'));
    }
  };

  return (
    <div
      className="flex w-full h-[70px] items-center border-b border-solid"
    >
      <Avatar
        size={26}
        name={currentAccount.id}
        variant={"marble"}
      />
      <div className="ml-[12px] flex-1">
        <div
          className="flex items-center"
          onClick={() => {
            navigate({
              to: SwithAccount.to,
            });
          }}
        >
          <div className="h-[24px] text-[16px] leading-[24px] text-white font-semibold">{currentAccount.name}</div>
          <img
            className="ml-[4px] cursor-pointer"
            src={ArrowDownIcon}
            alt="ArrowDown"
          />
        </div>
        <div className="flex items-center">
          <div className="h-[16px] text-[14px] leading-[16px] text-white opacity-60">{getShortAddress(address)}</div>
          <img
            className="ml-[4px] cursor-pointer"
            src={CopyIcon}
            alt="CopyIcon"
            onClick={copyToClipboard}
          />
        </div>
      </div>
    </div>
  );
}
