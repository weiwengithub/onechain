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
import { Route as OneTransfer } from '@/pages/onetransfer';
import type { EvmChain, SuiChain, TronChain, UniqueChainId } from '@/types/chain';
import {
  getFilteredAssetsByChainId,
  getFilteredChainsByChainId,
  getMainAssetByChainId,
  isStakeableAsset,
} from '@/utils/asset';
import { formatDecimal, formatNumberWithSeparator, plus, times, toDisplayDenomAmount } from '@/utils/numbers';
import { getCoinId, getUniqueChainId } from '@/utils/queryParamGenerator';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { isZkLoginAccount, getZkLoginSupportedChainId, isValidChainForAccount } from '@/utils/zklogin';

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
import TransferIcon from 'assets/images/onechain/wallet_home_transfer.png';
import FaucetIcon from 'assets/images/onechain/wallet_home_faucet.png';
import LayoutIcon from '@/assets/img/icon/layout.png';
import { isSidePanelView } from '@/utils/view/sidepanel.ts';
import { setPopupAsDefaultView, setSidePanelWithDefaultView } from '@/utils/view/controlView.ts';
import { useOctPrice } from '@/onechain/useOctPrice.ts';
import { Route as SwithAccount } from '@/pages/manage-account/switch-account';
import ArrowDownIcon from '@/assets/img/icon/arrow_down.png';
import { useCurrentAccount } from '@/hooks/useCurrentAccount.ts';
import Avatar from 'boring-avatars';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork.ts';
import { FunctionButton } from '@components/MainBox/Portfolio/components/FunctionButton.tsx';
import { useFaucet } from '@/hooks/useFaucet';
import { useCurrentAccountAddresses } from '@/hooks/useCurrentAccountAddresses';
import GeneralSettingButton from '@/components/Header/components/GeneralSettingButton';

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
  const { requestFaucet, isRequesting } = useFaucet();
  const { data: accountAddresses } = useCurrentAccountAddresses({ accountId: currentAccount.id });

  // console.log('      accountAddresses', accountAddresses);

  const currAddress = useMemo(() => {
    if (!selectedChainId) return undefined;
    const tempId = selectedChainId.split('__')[0];
    const res = accountAddresses?.find((item) => {
      return item.chainId === tempId;
    });
    return res?.address;
  }, [accountAddresses, selectedChainId]);

  const {
    userCurrencyPreference,
    isBalanceVisible,
    isDeveloperMode,
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

  // 只展示 oct, oct测试网, sui, sui测试网, tron, tron测试网
  const filteredChains = useMemo(() => {
    const res: (SuiChain | EvmChain | TronChain)[] = [];
    chainList.forEach((item) => {
      if (item.chainType === 'sui' || item.chainType === 'evm' || item.chainType === 'tron') {
        // 如果开启开发者模式，保留测试网
        if (isDeveloperMode || !item.id.includes('-testnet')) {
          res.push(item);
        }
      }
    });
    return res;
  }, [chainList, isDeveloperMode]);

  const handleViewChange = () => {
    if (isSidePanelView()) {
      setPopupAsDefaultView();
    } else {
      setSidePanelWithDefaultView(pathname);
    }
  };

  const handleChangeId = useCallback((chainId?: UniqueChainId) => {

    // debugger;

    onChangeChaindId(chainId);
    if (chainId?.endsWith('__sui')) {
      const suiId = chainId.startsWith('oct-testnet') ? 'oct-testnet'
        : chainId.startsWith('sui-testnet') ? 'sui-testnet'
          : chainId.startsWith('oct__') ? 'oct'
            : chainId.startsWith('sui__') ? 'sui'
              : 'oct';
      const suiChain = filteredChains.find(item => item.id === suiId) ?? filteredChains[0];
      // @ts-ignore
      void setCurrentSuiNetwork(suiChain);
    }
  }, [onChangeChaindId, filteredChains, setCurrentSuiNetwork]);


  // ZkLogin 账户的网络验证和自动修复逻辑
  useEffect(() => {
    if (isZkLoginAccount(currentAccount)) {
      // 检查当前选中的网络是否对 ZkLogin 账户有效
      if (!isValidChainForAccount(currentAccount, selectedChainId || null)) {
        // 自动切换到 ZkLogin 支持的网络
        const supportedChainId = getZkLoginSupportedChainId();
        handleChangeId(supportedChainId);
      }
    }
  }, [currentAccount.id, currentAccount.type, selectedChainId, handleChangeId, currentAccount]);

  const showOneTransfer = useMemo(() => {
    return selectedChainId?.includes('oct-testnet');
  }, [selectedChainId]);

  const showFaucet = useMemo(() => {
    return isShowAccountDetail && (selectedChainId?.includes('oct-testnet') || selectedChainId?.includes('sui-testnet'));
  }, [isShowAccountDetail, selectedChainId]);

  // 判断是否为 ZkLogin 账户，如果是则禁用网络切换
  const isZkLoginSingleNetwork = useMemo(() => {
    return currentAccount.type === 'ZKLOGIN';
  }, [currentAccount.type]);

  return (
    <>
      <MainBox
        top={
          <TopContainer>
            {isShowAccountDetail ? (
              <AddressActionButtons
                coinId={coinIdForReceivePage} variant="normal" typoVarient="h6n_M"
              />
            ) : (
              <TopLeftContainer>
                <Avatar
                  size={26}
                  name={currentAccount.id}
                  variant={'marble'}
                />
                <div
                  className="ml-[12px] flex items-center cursor-pointer"
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
                    className="ml-[4px]"
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
              <AllNetworkButton
                typoVarient="b4_M"
                variant="chip"
                currentChainId={selectedChainId}
                // chainList={chainList}
                chainList={filteredChains}
                isManageAssets
                sizeVariant="small"
                isZkLoginSingleNetwork={isZkLoginSingleNetwork}
                selectChainOption={(id) => {
                  handleChangeId(id);
                }}
              />
              <img
                src={LayoutIcon}
                alt="layout"
                className="size-[20px] cursor-pointer"
                onClick={handleViewChange}
              />
              <GeneralSettingButton />
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

              {/* faucet  send  receive*/}
              <div className="mt-[24px] flex justify-center gap-[8px]">
                <FunctionButton
                  name={t('components.MainBox.Portfolio.index.send')}
                  imageSrc={SendIcon}
                  onClick={() => {
                    if (isShowAccountDetail) {
                      void navigate({
                        to: SendCoinWithChainId.to,
                        params: {
                          chainId: selectedChainId as string,
                        },
                      });
                    } else {
                      void navigate({
                        to: SelectSendCoin.to,
                      });
                    }
                  }}
                />
                <FunctionButton
                  name={t('components.MainBox.Portfolio.index.receive')}
                  imageSrc={ReceiveIcon}
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
                />
                {showOneTransfer && <FunctionButton
                  name={t('components.MainBox.Portfolio.index.vault')}
                  imageSrc={TransferIcon}
                  onClick={() => {
                    navigate({
                      to: OneTransfer.to,
                    });
                  }}
                />}
                {showFaucet && currAddress && (
                  <FunctionButton
                    name={t('components.MainBox.Portfolio.index.faucet')}
                    imageSrc={FaucetIcon}
                    loading={isRequesting}
                    disabled={isRequesting}
                    onClick={() => {
                      if (selectedChainId && currAddress) {
                        requestFaucet({
                          recipient: currAddress,
                          chainId: selectedChainId,
                        });
                      }
                    }}
                  />
                )}
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
