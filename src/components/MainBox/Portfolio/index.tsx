import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from '@mui/material';
import { useLocation, useNavigate } from '@tanstack/react-router';
import AddressActionButtons from '@/components/AddressActionButtons';
import AllNetworkButton from '@/components/AllNetworkButton';
import ChipButton from '@/components/common/ChipButton';
import IconTextButton from '@/components/common/IconTextButton';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice';
import { Route as GeneralSetting } from '@/pages/general-setting';
import CurrencyBottomSheet from '@/pages/general-setting/-components/CurrencyBottomSheet';
import { Route as SelectReceiveCoin } from '@/pages/wallet/receive';
import { Route as ReceiveWithChainId } from '@/pages/wallet/receive/chain/$chainId';
import { Route as SelectSendCoin } from '@/pages/wallet/send';
import { Route as SendCoinWithChainId } from '@/pages/wallet/send/chain/$chainId';
import type { SuiChain, UniqueChainId } from '@/types/chain';
import {
  getFilteredAssetsByChainId,
  getFilteredChainsByChainId,
  getMainAssetByChainId,
  isStakeableAsset,
} from '@/utils/asset';
import { formatDecimal, formatNumberWithSeparator, plus, times, toDisplayDenomAmount } from '@/utils/numbers';
import { getCoinId, getUniqueChainId } from '@/utils/queryParamGenerator';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import MoreOptionBottomSheet from './components/MoreOptionBottomSheet';
import {
  BodyBottomChipButtonContainer,
  BodyBottomContainer,
  BodyContainer,
  BodyTopContainer,
  ChipButtonContentsContainer,
  StyledChipButton,
  TopContainer,
  TopLeftContainer,
  TopRightContainer,
  ViewTotalValueText,
} from './styled';
import MainBox from '..';

import SendIcon from 'assets/images/onechain/wallet_home_send.png';
import ReceiveIcon from 'assets/images/onechain/wallet_home_receive.png';
import SettingIcon from '@/assets/img/icon/setting.png';
import LayoutIcon from '@/assets/img/icon/layout.png';
import { isSidePanelView } from '@/utils/view/sidepanel.ts';
import { setPopupAsDefaultView, setSidePanelWithDefaultView } from '@/utils/view/controlView.ts';
import { useOctPrice } from '@/onechain/useOctPrice.ts';
import { Route as SwithAccount } from '@/pages/manage-account/switch-account';
import ArrowDownIcon from '@/assets/img/icon/arrow_down.png';
import { useCurrentAccount } from '@/hooks/useCurrentAccount.ts';
import Avatar from 'boring-avatars';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork.ts';

type PortFolioProps = {
  selectedChainId?: UniqueChainId;
  onChangeChaindId: (chainId?: UniqueChainId) => void;
};

export default function PortFolio({ selectedChainId, onChangeChaindId }: PortFolioProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  //todo
  const tempDisplay = false;

  const { currentAccount } = useCurrentAccount();
  const { setCurrentSuiNetwork } = useCurrentSuiNetwork();

  const {
    userCurrencyPreference,
    isBalanceVisible,
    updateExtensionStorageStore,
  } = useExtensionStorageStore((state) => state);
  const { data: coinGeckoPrice, isLoading } = useCoinGeckoPrice();

  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
  });

  const [aggregatedTotalValue, setAggregatedTotalValue] = useState('0');

  const [isOpenCurrencyBottomSheet, setIsOpenCurrencyBottomSheet] = useState(false);
  const [isOpenMoreOptionBottomSheet, setIsOpenMoreOptionBottomSheet] = useState(false);

  const chainList = useMemo(() => getFilteredChainsByChainId(accountAllAssets?.flatAccountAssets), [accountAllAssets?.flatAccountAssets]);

  const selectedChainMainAsset = useMemo(
    () => selectedChainId && getMainAssetByChainId(accountAllAssets?.flatAccountAssets, selectedChainId),
    [accountAllAssets?.flatAccountAssets, selectedChainId],
  );

  const coinIdForReceivePage = useMemo(() => {
    if (!selectedChainMainAsset?.asset) return undefined;

    return getCoinId(selectedChainMainAsset.asset);
  }, [selectedChainMainAsset?.asset]);

  const chainIdForReceivePage = useMemo(() => {
    if (!selectedChainMainAsset?.chain) return undefined;

    return getUniqueChainId(selectedChainMainAsset.chain);
  }, [selectedChainMainAsset?.chain]);

  const isShowAccountDetail = !!selectedChainMainAsset?.asset && !!coinIdForReceivePage;

  // const swapDappURL = useMemo(() => {
  //   if (!selectedChainId || (selectedChainMainAsset?.chain.chainType === 'cosmos' && selectedChainMainAsset.chain.isSupportHistory)) {
  //     return 'https://www.mintscan.io/wallet/swap';
  //   }
  //
  //   return undefined;
  // }, [selectedChainId, selectedChainMainAsset?.chain]);

  const { priceInfo } = useOctPrice();

  useEffect(() => {

    if (!accountAllAssets?.flatAccountAssets || accountAllAssets.flatAccountAssets.length === 0) {
      return;
    }

    const filteredAssetsByChainId = getFilteredAssetsByChainId(accountAllAssets?.flatAccountAssets, selectedChainId);

    const aggregateValue = filteredAssetsByChainId.reduce((acc, item) => {
      const balance = isStakeableAsset(item) ? item.totalBalance || '0' : item.balance;

      const displayAmount = toDisplayDenomAmount(balance, item.asset.decimals || 0);

      let coinPrice = 0;
      const coinGeckoId = item.asset.coinGeckoId;
      if (!coinGeckoId) {
        //do nothing
      } else if (coinGeckoId.startsWith('oct')) {
        const coinId = item.asset.id;
        coinPrice = priceInfo[coinId]?.octPrice ?? 0;
      } else {
        coinPrice = coinGeckoPrice?.[coinGeckoId]?.[userCurrencyPreference] ?? 0;
        ;
      }
      const value = times(displayAmount, coinPrice);
      // return plus(acc, value);

      // 仅当链类型为 'sui' 时才累加
      if (item.chain.chainType === 'sui') {
        return plus(acc, value);
      }

      // 否则返回当前累积值
      return acc;
    }, '0');

    setAggregatedTotalValue(Number(aggregateValue).toFixed(2));
  }, [priceInfo, accountAllAssets, coinGeckoPrice, userCurrencyPreference, isLoading, selectedChainId]);

  // 只展示 oct, oct测试网, sui, sui测试网
  const onlySuiChain = useMemo(() => {
    const res: SuiChain[] = [];
    chainList.forEach((item) => {
      if (item.chainType === 'sui') {
        res.push(item);
      }
    });
    return res;
  }, [chainList]);

  const handleViewChange = () => {
    if (isSidePanelView()) {
      setPopupAsDefaultView();
    } else {
      setSidePanelWithDefaultView(pathname);
    }
  };

  const handleChangeId = useCallback((chainId?: UniqueChainId) => {
    onChangeChaindId(chainId);
    if (chainId?.endsWith('__sui')) {
      const suiId = chainId.startsWith('oct-testnet') ? 'oct-testnet'
        : chainId.startsWith('sui-testnet') ? 'sui-testnet'
          : chainId.startsWith('oct__') ? 'oct'
            : chainId.startsWith('sui__') ? 'sui'
              : 'oct';
      const suiChain = onlySuiChain.find(item => item.id === suiId) ?? onlySuiChain[0];
      void setCurrentSuiNetwork(suiChain);
    }
  }, [onChangeChaindId, onlySuiChain, setCurrentSuiNetwork]);

  return (
    <>
      <MainBox
        top={
          <TopContainer>
            {isShowAccountDetail ? (
              <AddressActionButtons coinId={coinIdForReceivePage} variant="normal" typoVarient="h6n_M" />
            ) : (
              <TopLeftContainer>
                <Avatar
                  size={26}
                  name={currentAccount.id}
                  variant={'marble'}
                />
                <div
                  className="ml-[12px] flex items-center"
                  onClick={() => {
                    navigate({
                      to: SwithAccount.to,
                    });
                  }}
                >
                  <div
                    className="h-[24px] text-[16px] leading-[24px] text-white font-semibold"
                  >{currentAccount.name}</div>
                  <img
                    className="ml-[4px] cursor-pointer"
                    src={ArrowDownIcon}
                    alt="ArrowDown"
                  />
                </div>
                {/*<IconTextButton*/}
                {/*  onClick={() => {*/}
                {/*    updateExtensionStorageStore('isBalanceVisible', !isBalanceVisible);*/}
                {/*  }}*/}
                {/*>*/}
                {/*  <ViewTotalValueText variant="b3_M">{t('components.MainBox.Portfolio.index.totalValue')}</ViewTotalValueText>*/}
                {/*</IconTextButton>*/}
              </TopLeftContainer>
            )}
            <TopRightContainer>
              <img
                src={SettingIcon}
                alt="setting"
                className="size-[20px] cursor-pointer"
                onClick={() => {
                  navigate({
                    to: GeneralSetting.to,
                  });
                }}
              />
              <img
                src={LayoutIcon}
                alt="layout"
                className="size-[20px] cursor-pointer"
                onClick={handleViewChange}
              />
              <AllNetworkButton
                typoVarient="b4_M"
                variant="chip"
                currentChainId={selectedChainId}
                // chainList={chainList}
                chainList={onlySuiChain}
                isManageAssets
                sizeVariant="small"
                selectChainOption={(id) => {
                  handleChangeId(id);
                }}
              />
            </TopRightContainer>
          </TopContainer>
        }
        body={
          <BodyContainer>
            <BodyTopContainer>
              <IconTextButton
                // onClick={() => {
                //   setIsOpenCurrencyBottomSheet(true);
                // }}
                // trailingIcon={
                //   <StyledIconContainer>
                //     <BottomFilledChevronIcon />
                //   </StyledIconContainer>
                // }
              >
                <div style={{ flexDirection: 'column', display: 'flex' }}>
                  <div
                    className="h-[32px] text-center text-[36px] leading-[32px] font-bold text-white"
                  >${formatNumberWithSeparator(formatDecimal(aggregatedTotalValue, 2))}</div>
                  <div className="mt-[12px] h-[20px] text-center text-[16px] leading-[20px] text-white">+$0.00 (+0%)
                  </div>
                  {/*<TotalBalanceContainer>*/}
                  {/*  {isProcessing ? (*/}
                  {/*    <Typography variant="h1n_B">{'--'}</Typography>*/}
                  {/*  ) : (*/}
                  {/*    <BalanceDisplay typoOfIntegers="h1n_B" typoOfDecimals="h2n_M" currency={userCurrencyPreference} isDisableLeadingCurreny>*/}
                  {/*      {aggregatedTotalValue}*/}
                  {/*    </BalanceDisplay>*/}
                  {/*  )}*/}
                  {/*  &nbsp;*/}
                  {/*  <Typography variant="h1n_B">{userCurrencyPreference.toLocaleUpperCase()}</Typography>*/}
                  {/*</TotalBalanceContainer>*/}
                  {/*<div style={{fontSize:'18px', color:'#ffffff', marginTop:10}}>+$0.00(+0%)</div>*/}
                </div>

              </IconTextButton>
            </BodyTopContainer>
            <BodyBottomContainer>
              {tempDisplay && <BodyBottomChipButtonContainer>
                <ChipButton
                  variant="light"
                  onClick={() => {
                    if (isShowAccountDetail) {
                      navigate({
                        to: SendCoinWithChainId.to,
                        params: {
                          chainId: selectedChainId as string,
                        },
                      });
                    } else {
                      navigate({
                        to: SelectSendCoin.to,
                      });
                    }
                  }}
                >
                  <Typography variant="b4_M">{t('components.MainBox.Portfolio.index.send')}</Typography>
                </ChipButton>
                <StyledChipButton
                  variant="dark"
                  onClick={() => {
                    if (isShowAccountDetail && chainIdForReceivePage) {
                      navigate({
                        to: ReceiveWithChainId.to,
                        params: {
                          chainId: chainIdForReceivePage as UniqueChainId,
                        },
                      });
                    } else {
                      navigate({
                        to: SelectReceiveCoin.to,
                      });
                    }
                  }}
                >
                  <ChipButtonContentsContainer>
                    <Typography variant="b4_M">{t('components.MainBox.Portfolio.index.receive')}</Typography>
                  </ChipButtonContentsContainer>
                </StyledChipButton>
              </BodyBottomChipButtonContainer>}

              {/*send and receive*/}
              <div className="mt-[24px] flex justify-center gap-[8px]">
                <div
                  className="flex size-[72px] cursor-pointer flex-col items-center rounded-[8px] bg-[#2C3039] pr-[12px] pl-[12px] leading-[40px] hover:bg-[#0047C4]"
                  onClick={() => {
                    if (isShowAccountDetail) {
                      navigate({
                        to: SendCoinWithChainId.to,
                        params: {
                          chainId: selectedChainId as string,
                        },
                      });
                    } else {
                      navigate({
                        to: SelectSendCoin.to,
                      });
                    }
                  }}
                >
                  <img
                    className="mx-auto mt-[12px] size-[24px]"
                    src={SendIcon}
                    alt="send"
                  />
                  <div className="mt-[8px] h-[20px] text-white text-center text-[14px] leading-[20px]">Send</div>
                </div>
                <div
                  className="flex size-[72px] cursor-pointer flex-col items-center rounded-[8px] bg-[#2C3039] pr-[12px] pl-[12px] leading-[40px] hover:bg-[#0047C4]"
                  onClick={() => {
                    if (isShowAccountDetail && chainIdForReceivePage) {
                      navigate({
                        to: ReceiveWithChainId.to,
                        params: {
                          chainId: chainIdForReceivePage as UniqueChainId,
                        },
                      });
                    } else {
                      navigate({
                        to: SelectReceiveCoin.to,
                      });
                    }
                  }}
                >
                  <img
                    className="mx-auto mt-[12px] size-[24px]"
                    src={ReceiveIcon}
                    alt="receive"
                  />
                  <div className="mt-[8px] h-[20px] text-white text-center text-[14px] leading-[20px]">Receive</div>
                </div>
              </div>

            </BodyBottomContainer>
          </BodyContainer>
        }
        // bottom={
        //    <BottomButtonContainer>
        //     <StyledIconTextButton
        //       onClick={() => {
        //         navigate({
        //           to: SelectStakeCoin.to,
        //         });
        //       }}
        //       leadingIcon={<StakeIcon />}
        //       direction="vertical"
        //     >
        //       <SpacedTypography variant="b3_M">{t('components.MainBox.Portfolio.index.stake')}</SpacedTypography>
        //     </StyledIconTextButton>
        //     <StyledIconTextButton
        //       leadingIcon={<SwapIcon />}
        //       direction="vertical"
        //       disabled={!swapDappURL}
        //       onClick={() => {
        //         if (swapDappURL) {
        //           window.open(swapDappURL, '_blank');
        //         }
        //       }}
        //     >
        //       <SpacedTypography variant="b3_M">{t('components.MainBox.Portfolio.index.swap')}</SpacedTypography>
        //     </StyledIconTextButton>
        //
        //     <StyledIconTextButton
        //       onClick={() => {
        //         navigate({
        //           to: DappList.to,
        //         });
        //       }}
        //       leadingIcon={<DappIcon />}
        //       direction="vertical"
        //     >
        //       <SpacedTypography variant="b3_M">{t('components.MainBox.Portfolio.index.dapp')}</SpacedTypography>
        //     </StyledIconTextButton>
        //     <StyledIconTextButton
        //       onClick={() => {
        //         setIsOpenMoreOptionBottomSheet(true);
        //       }}
        //       leadingIcon={<MoreIcon />}
        //       direction="vertical"
        //     >
        //       <SpacedTypography variant="b3_M">{t('components.MainBox.Portfolio.index.more')}</SpacedTypography>
        //     </StyledIconTextButton>
        //   </BottomButtonContainer>
        // }
        className="portfoiloBackground"
        // backgroundImage={cosmostationLogoImg}
      />
      <CurrencyBottomSheet open={isOpenCurrencyBottomSheet} onClose={() => setIsOpenCurrencyBottomSheet(false)} />
      <MoreOptionBottomSheet open={isOpenMoreOptionBottomSheet} onClose={() => setIsOpenMoreOptionBottomSheet(false)} />
    </>
  );
}
