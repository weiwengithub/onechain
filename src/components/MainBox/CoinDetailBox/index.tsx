import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import EthermintSendBottomSheet from '@/components/EthermintSendBottomSheet';
import { NEUTRON_CHAINLIST_ID, NEUTRON_TESTNET_CHAINLIST_ID } from '@/constants/cosmos/chain';
import { NATIVE_EVM_COIN_ADDRESS } from '@/constants/evm';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
// import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset';
import { Route as Receive } from '@/pages/wallet/receive/$coinId';
import { Route as Send } from '@/pages/wallet/send/$coinId';
import { isStakeableAsset } from '@/utils/asset';
import { formatDecimal, formatNumberWithSeparator, times, toDisplayDenomAmount } from '@/utils/numbers';
import { getCoinId, parseCoinId } from '@/utils/queryParamGenerator';
import { isEqualsIgnoringCase } from '@/utils/string';
// import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import MoreOptionBottomSheet from './components/MoreOptionBottomSheet';

import DaoIcon from '@/assets/images/icons/Dao28.svg';
import VaultIcon from '@/assets/images/icons/Vault28.svg';

import SendIcon2 from 'assets/images/onechain/wallet_home_send.png';
import ReceiveIcon2 from 'assets/images/onechain/wallet_home_receive.png';

// import DefaultCoinImage from '@/assets/images/coin/defaultCoin.png';
import { cn } from '@/utils/date.ts';
import { usePrice } from '@/onechain/usePrice.ts';
import { FunctionButton } from '@components/MainBox/Portfolio/components/FunctionButton.tsx';

type CoinDetailBoxProps = {
  coinId: string;
};

export default function CoinDetailBox({ coinId }: CoinDetailBoxProps) {
  const [isOpenMoreOptionBottomSheet, setIsOpenMoreOptionBottomSheet] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();

  // const { userCurrencyPreference } = useExtensionStorageStore((state) => state);
  // const { data: coinGeckoPrice } = useCoinGeckoPrice();

  const [isOpenBottomSheet, setIsOpenBottomSheet] = useState(false);

  const { getAccountAsset } = useGetAccountAsset({ coinId });

  const { data: currentAccountAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
    disableDupeEthermint: true,
  });

  const currentCoin = getAccountAsset();

  // const coinGeckoId = currentCoin?.asset.coinGeckoId;

  const balance = currentCoin && isStakeableAsset(currentCoin) ? currentCoin.totalBalance || '0' : currentCoin?.balance || '0';

  const totalDisplayAmount = toDisplayDenomAmount(balance, currentCoin?.asset.decimals || 0);
  // const chainPrice = (coinGeckoId && coinGeckoPrice?.[coinGeckoId]?.[userCurrencyPreference]) || 0;
  // const [chainPrice, setChainPrice] = useState<number>(0.1);
  //
  // useEffect(() => {
  //   const getPrice = async ()=>{
  //     const res = await oneChainApi.getMarketPrice();
  //     if (res?.success && res.data) {
  //       setChainPrice(Number(res.data.price) ?? 0.1);
  //     }
  //   };
  //   getPrice();
  // }, []);

  const { chainPrice } = usePrice({ coinId: currentCoin?.asset.id, coinGeckoId: currentCoin?.asset.coinGeckoId });

  const totalValue = times(totalDisplayAmount, chainPrice);

  const cosmosStyleCoin = useMemo(() => {
    const isEthermint = currentCoin?.chain.chainType === 'evm' && currentCoin.chain.isCosmos;

    const isMainCoin = isEqualsIgnoringCase(currentCoin?.asset.id, NATIVE_EVM_COIN_ADDRESS);

    if (isEthermint && isMainCoin) {
      return currentAccountAssets?.cosmosAccountAssets.find(
        (item) =>
          item.asset.id === currentCoin.chain.mainAssetDenom &&
          item.chain.id === currentCoin.chain.id &&
          item.address.chainId === currentCoin.address.chainId &&
          item.address.accountType.hdPath === currentCoin.address.accountType.hdPath,
      );
    }

    return undefined;
  }, [currentAccountAssets?.cosmosAccountAssets, currentCoin]);

  const isNTRN = [NEUTRON_CHAINLIST_ID, NEUTRON_TESTNET_CHAINLIST_ID].some((item) => item === parseCoinId(coinId || '').chainId);

  const moreOptionProps = (() => {
    if (isNTRN) {
      return [
        {
          icon: <VaultIcon />,
          title: t('components.MainBox.CoinDetailBox.index.vault'),
          subTitle: t('components.MainBox.CoinDetailBox.index.vaultDescription'),
          onClick: () => {
            window.open(`https://www.mintscan.io/${parseCoinId(coinId || '').chainId}/dao/vault?sector=vault`, '_blank');
          },
        },
        {
          icon: <DaoIcon />,
          title: t('components.MainBox.CoinDetailBox.index.dao'),
          subTitle: t('components.MainBox.CoinDetailBox.index.daoDescription'),
          onClick: () => {
            window.open(`https://www.mintscan.io/${parseCoinId(coinId || '').chainId}/dao/vault?sector=proposals`, '_blank');
          },
        },
      ];
    }

    return undefined;
  })();

  const hanldeOnClickSend = () => {
    if (parseFloat(totalDisplayAmount) > 0) {
      if (cosmosStyleCoin) {
        setIsOpenBottomSheet(true);
      } else {
        navigate({
          to: Send.to,
          params: { coinId: coinId },
        });
      }
    }
  };

  const hanldeOnClickReceive = () => {
    navigate({
      to: Receive.to,
      params: { coinId: coinId },
    });
  };

  const hanldeOnEthermintSend = useCallback(
    (val: 'cosmos' | 'evm') => {
      if (!currentCoin) return;

      if (val === 'cosmos') {
        if (cosmosStyleCoin) {
          const cosmosStyleCoinId = getCoinId(cosmosStyleCoin.asset);

          navigate({
            to: Send.to,
            params: { coinId: cosmosStyleCoinId },
          });
        }
      } else {
        navigate({
          to: Send.to,
          params: { coinId: coinId },
        });
      }
    },
    [coinId, cosmosStyleCoin, currentCoin, navigate],
  );

  return (
    <>
      <div className="h-[24px] text-center text-[32px] leading-[24px] font-bold text-white">
        {formatNumberWithSeparator(formatDecimal(totalDisplayAmount))}
      </div>
      <div
        className="mt-[12px] h-[16px] text-center text-[14px] leading-[16px] text-white opacity-60"
      >≈${formatNumberWithSeparator(formatDecimal(totalValue, 2))}</div>
      <div className="mt-[24px] flex justify-center gap-[8px]">
        <FunctionButton
          onClick={hanldeOnClickSend} imageSrc={SendIcon2} name={t('components.MainBox.Portfolio.index.send')}
        />
        <FunctionButton
          onClick={hanldeOnClickReceive} imageSrc={ReceiveIcon2} name={t('components.MainBox.Portfolio.index.receive')}
        />
      </div>
      {cosmosStyleCoin && (
        <EthermintSendBottomSheet
          open={isOpenBottomSheet}
          onClose={() => setIsOpenBottomSheet(false)}
          bech32AddressPrefix={cosmosStyleCoin.chain.accountPrefix + 1}
          onSelectOption={hanldeOnEthermintSend}
        />
      )}
      {moreOptionProps && (
        <MoreOptionBottomSheet
          open={isOpenMoreOptionBottomSheet} onClose={() => setIsOpenMoreOptionBottomSheet(false)}
          buttonProps={moreOptionProps}
        />
      )}
    </>
  );
}
