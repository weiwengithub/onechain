import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import { Typography } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import CheckLegacyAddressBalanceBottomSheet from '@/components/CheckLegacyAddressBalanceBottomSheet';
import CoinWithMarketTrendButton from '@/components/CoinWithMarketTrendButton';
import CheckBoxTextButton from '@/components/common/CheckBoxTextButton';
import IconTextButton from '@/components/common/IconTextButton';
// import { Tab, Tabs } from '@/components/common/Tab';
import { VirtualizedList } from '@/components/common/VirtualizedList';
import EmptyAsset from '@/components/EmptyAsset';
import PortFolio from '@/components/MainBox/Portfolio';
import Search from '@/components/Search';
import SortBottomSheet from '@/components/SortBottomSheet';
import { useScroll } from '@/components/Wrapper/components/ScrollProvider';
import { CURRENCY_TYPE } from '@/constants/currency';
import { DASHBOARD_COIN_SORT_KEY } from '@/constants/sortKey';
import { useUpdateBalance } from '@/hooks/update/useUpdateBalance';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice';
import { useCurrentAccountAddedNFTsWithMetaData } from '@/hooks/useCurrentAccountAddedNFTsWithMetaData';
import { useForceRefreshBalance } from '@/hooks/useForceRefreshBalance';
import { useGroupAccountAssets } from '@/hooks/useGroupAccountAssets';
import { useSmartBalanceRefresh } from '@/hooks/useSmartBalanceRefresh';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { Route as CoinDetail } from '@/pages/coin-detail/$coinId';
import { Route as CoinOverview } from '@/pages/coin-overview/$coinId';
import { Route as ManageAssets } from '@/pages/manage-assets/visibility/assets';
import type { FlatAccountAssets } from '@/types/accountAssets';
import type { DashboardCoinSortKeyType } from '@/types/sortKey';
import { getDefaultAssets, getFilteredAssetsByChainId, isStakeableAsset } from '@/utils/asset';
import { isTestnetChain } from '@/utils/chain';
import { gt, gte, minus, times, toDisplayDenomAmount } from '@/utils/numbers';
import { getCoinId } from '@/utils/queryParamGenerator';
import { isEqualsIgnoringCase } from '@/utils/string';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import NFTList from './-components/NFTList';
import SkeletonCoinList from './-components/SkeletonCoinList';
import {
  ScrollWrapper,
  CoinButtonWrapper,
  Container,
  Tabs,
  EmptyAssetContainer,
  FilterContaienr,
  ManageCryptoContainer,
  MarginLeftTypography,
  // StickyTabContainer,
  StickyTabPanelContentsContainer,
  StyledTabPanel,
} from './-styled';

import NoListIcon from '@/assets/images/icons/NoList70.svg';
import PlusIcon from '@/assets/images/icons/Plus12.svg';
import EditIcon from '@/assets/img/icon/edit.png';
import CryptoEmpty from '@/assets/img/crypto_empty.png';
import { cn } from '@/utils/date.ts';
import DefaultCoinImage from '@/assets/images/coin/defaultCoin.png';

type PortfolioCoinItem = FlatAccountAssets & {
  value: string;
  dollarValue: string;
  totalDisplayAmount: string;
  counts: string;
};

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { currentAccount } = useCurrentAccount();
  const currentUserHiddenAssetIds = useExtensionStorageStore.getState()[`${currentAccount.id}-user-hidden-assetIds`] || [];
  const userHiddenAssetIds = currentUserHiddenAssetIds.map(item => `${item.id}__${item.chainId}__${item.chainType}`);
  //todo
  const tempDisplay = false;

  const { scrollToTop } = useScroll();
  const { isLoading: isUpdateBalnaceLoading } = useUpdateBalance();

  const { data: accountAllAssets } = useAccountAllAssets({ filterByPreferAccountType: true });
  const { data: coinGeckoPrice, isLoading: isCoinGeckoPriceLoading } = useCoinGeckoPrice();
  const { data: usdCoinGeckoPrice, isLoading: isCoinGeckoPriceUSDLoading } = useCoinGeckoPrice('usd');

  const {
    dashboardCoinSortKey,
    userCurrencyPreference,
    isHideSmalValue,
    isDeveloperMode,
    selectedChainFilterId,
    updateExtensionStorageStore,
  } = useExtensionStorageStore(
    (state) => state,
  );
  useCurrentAccountAddedNFTsWithMetaData();
  const [search, setSearch] = useState('');
  const [debouncedSearch, { cancel, isPending }] = useDebounce(search, 300);

  const isDebouncing = useMemo(() => {
    return !!search && isPending();
  }, [isPending, search]);

  const [isOpenSortBottomSheet, setIsOpenSortBottomSheet] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // const tabLabels = ['Crypto', 'NFTs'];
  // const tabLabels = ['Tokens'];

  const { groupAccountAssets, isLoading: isGroupAssetsLoading } = useGroupAccountAssets();
  const { forceRefresh } = useForceRefreshBalance();

  // 使用智能刷新，自动处理各种场景下的余额更新
  useSmartBalanceRefresh();

  const isFirstBalanceLoading = useMemo(() => {
    return !groupAccountAssets?.singleAccountAssets.length && !groupAccountAssets?.groupAccountAssets.length && isUpdateBalnaceLoading;
  }, [groupAccountAssets, isUpdateBalnaceLoading]);

  const isLoading = useMemo(() => {
    return isFirstBalanceLoading || isGroupAssetsLoading || isCoinGeckoPriceLoading || isCoinGeckoPriceUSDLoading;
  }, [isCoinGeckoPriceLoading, isCoinGeckoPriceUSDLoading, isFirstBalanceLoading, isGroupAssetsLoading]);

  const chainDefaultCoins = useMemo<PortfolioCoinItem[] | undefined>(() => {
    const chainFilteredAllCoins = getFilteredAssetsByChainId(accountAllAssets?.flatAccountAssets, selectedChainFilterId || undefined);

    const chainDefaultCoins = getDefaultAssets(chainFilteredAllCoins)
      ?.slice()
      .sort((a, b) => {
        const denoms = a.chain.chainDefaultCoinDenoms ?? [];
        const idxA = denoms.findIndex((d) => isEqualsIgnoringCase(d, a.asset.id));
        const idxB = denoms.findIndex((d) => isEqualsIgnoringCase(d, b.asset.id));

        return (idxA < 0 ? Number.MAX_SAFE_INTEGER : idxA) - (idxB < 0 ? Number.MAX_SAFE_INTEGER : idxB);
      });

    if (!chainDefaultCoins || chainDefaultCoins?.length === 0) return undefined;

    return chainDefaultCoins.filter(item => !userHiddenAssetIds.includes(`${item.asset.id}__${item.asset.chainId}__${item.asset.chainType}`)).map((item) => {
      const balance = isStakeableAsset(item) ? item.totalBalance || '0' : item.balance;
      const totalDisplayAmount = toDisplayDenomAmount(balance, item.asset.decimals) || '0';

      const coinPrice = (item.asset.coinGeckoId && coinGeckoPrice?.[item.asset.coinGeckoId]?.[userCurrencyPreference]) || 0;
      const coinPriceInDolalr = (item.asset.coinGeckoId && usdCoinGeckoPrice?.[item.asset.coinGeckoId]?.[CURRENCY_TYPE.USD]) || 0;

      const value = times(totalDisplayAmount, coinPrice);
      const valueInDollar = times(totalDisplayAmount, coinPriceInDolalr);
      return {
        ...item,
        counts: '1',
        totalDisplayAmount,
        value,
        dollarValue: valueInDollar,
      };
    });
  }, [accountAllAssets?.flatAccountAssets, coinGeckoPrice, selectedChainFilterId, usdCoinGeckoPrice, userCurrencyPreference, userHiddenAssetIds]);

  const computedAssetValues = useMemo<PortfolioCoinItem[]>(() => {
    // debugger;

    const baseCoinList = [...(groupAccountAssets?.groupAccountAssets || []), ...(groupAccountAssets?.singleAccountAssets || [])];

    const unGroupedAccountAssets = Object.values(groupAccountAssets?.groupMap || []).flat();
    const mappedUngroupAccountAssets = unGroupedAccountAssets.map((item) => {
      const balance = isStakeableAsset(item) ? item.totalBalance || '0' : item.balance;
      const totalDisplayAmount = toDisplayDenomAmount(balance, item.asset.decimals);

      return {
        ...item,
        counts: '1',
        totalDisplayAmount,
      };
    });

    const displayedAssets =
      (!!search && debouncedSearch.length > 1) || selectedChainFilterId
        ? [...mappedUngroupAccountAssets, ...(groupAccountAssets?.singleAccountAssets || [])]
        : baseCoinList;

    return displayedAssets.map((item) => {
      const displayAmount = item.totalDisplayAmount || '0';

      const coinPrice = (item.asset.coinGeckoId && coinGeckoPrice?.[item.asset.coinGeckoId]?.[userCurrencyPreference]) || 0;
      const coinPriceInDolalr = (item.asset.coinGeckoId && usdCoinGeckoPrice?.[item.asset.coinGeckoId]?.[CURRENCY_TYPE.USD]) || 0;

      const value = times(displayAmount, coinPrice);
      const valueInDollar = times(displayAmount, coinPriceInDolalr);

      return {
        ...item,
        value,
        dollarValue: valueInDollar,
      };
    });
  }, [
    coinGeckoPrice,
    debouncedSearch.length,
    groupAccountAssets,
    search,
    selectedChainFilterId,
    usdCoinGeckoPrice,
    userCurrencyPreference,
  ]);

  const hideSmallValueAssets = useMemo(() => {
    if (isHideSmalValue) {
      return computedAssetValues.filter((coin) => {
        return gte(coin.dollarValue, '1');
      });
    }

    return computedAssetValues;
  }, [computedAssetValues, isHideSmalValue]);

  const sortedAssets = useMemo(
    () =>
      hideSmallValueAssets.toSorted((a, b) => {
        if (dashboardCoinSortKey === DASHBOARD_COIN_SORT_KEY.VALUE_HIGH_ORDER) {
          return Number(minus(b.value, a.value));
        }

        if (dashboardCoinSortKey === DASHBOARD_COIN_SORT_KEY.ALPHABETICAL_ASC) {
          return a.asset.symbol.localeCompare(b.asset.symbol);
        }

        return 0;
      }),
    [dashboardCoinSortKey, hideSmallValueAssets],
  );

  const filteredAssetsBySearch = useMemo(() => {
    const filterdByChain = getFilteredAssetsByChainId(sortedAssets, selectedChainFilterId || undefined);
    if (!!search && debouncedSearch.length > 1) {
      return (
        filterdByChain.filter((asset) => {
          const condition = [asset.asset.symbol, asset.asset.id];

          return condition.some((item) => item.toLowerCase().indexOf(debouncedSearch.toLowerCase()) > -1);
        }) || []
      );
    }
    if (selectedChainFilterId) {
      return [...(chainDefaultCoins || []), ...filterdByChain].reduce((acc: PortfolioCoinItem[], item) => {
        if (!acc.some((existing) => existing.asset.id === item.asset.id)) {
          acc.push(item as PortfolioCoinItem);
        }
        return acc;
      }, []);
    } else {
      // return filterdByChain;

      return [...(chainDefaultCoins || []), ...filterdByChain].reduce((acc: PortfolioCoinItem[], item) => {
        if (
          !acc.some((existing) => {
            return existing.asset.id === item.asset.id && existing.asset.chainId === item.asset.chainId;
          })
        ) {
          acc.push(item as PortfolioCoinItem);
        }
        return acc;
      }, []);
    }
  }, [chainDefaultCoins, debouncedSearch, search, selectedChainFilterId, sortedAssets]);

  // const handleChange = (_: React.SyntheticEvent, newTabValue: number) => {
  //   setTabValue(newTabValue);
  // };

  useEffect(() => {
    if (search.length > 1 || search.length === 0) {
      scrollToTop();
    }
  }, [scrollToTop, search.length]);

  // 禁止浏览器返回按钮
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    // 添加一个初始的历史状态
    window.history.pushState(null, '', window.location.href);

    // 监听popstate事件
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const filteredAssets = useMemo(() => {
    const res: PortfolioCoinItem[] = [];
    filteredAssetsBySearch.forEach((item) => {
      if (item.chain.chainType === 'sui' || item.chain.chainType === 'evm') {
        // 如果isDeveloperMode为false，过滤掉测试网资产
        if (!isDeveloperMode && item.chain.id.includes('-testnet')) {
          return;
        }
        res.push(item);
      }
    });
    return res;
  }, [filteredAssetsBySearch, isDeveloperMode]);

  return (
    <>
      <BaseBody>
        <ScrollWrapper>
          <EdgeAligner
            style={{
              flex: '1',
            }}
          >
            <Container>
              <PortFolio
                selectedChainId={selectedChainFilterId || undefined}
                onChangeChaindId={(chainId) => {
                  updateExtensionStorageStore('selectedChainFilterId', chainId || null);
                }}
              />
              {/*Tokens NFTs 切换*/}
              <Tabs>
                <div className="flex flex-1 pt-[8px]">
                  <div
                    className={cn(
                      'box-content h-[16px] cursor-pointer border-b-2 border-solid pb-[12px] text-[16px] leading-[16px] text-white',
                      tabValue === 0 ? 'border-[#477CFC] text-[#477CFC]' : 'border-none',
                    )}
                    onClick={() => {
                      setTabValue(0);
                    }}
                  >
                    {t('pages.index.tokens')}
                  </div>
                  {/*<div*/}
                  {/*  className={cn(*/}
                  {/*    "ml-[16px] box-content h-[16px] cursor-pointer border-b-2 border-solid pb-[12px] text-[16px] leading-[16px] text-white",*/}
                  {/*    tabValue === 1 ? "border-[#0047C4] text-[#0047C4]" : "border-none",*/}
                  {/*  )}*/}
                  {/*  onClick={() => {*/}
                  {/*    setTabValue(1);*/}
                  {/*  }}*/}
                  {/*>*/}
                  {/*  NFTs*/}
                  {/*</div>*/}
                </div>
                <div
                  className="size-[32px] rounded-[20px]"
                  onClick={() => {
                    navigate({
                      to: ManageAssets.to,
                    });
                  }}
                >
                  <img
                    src={EditIcon}
                    alt="edit"
                    className="size-[16px] ml-[8px] mt-[8px]"
                  />
                </div>
              </Tabs>
              <StyledTabPanel
                value={tabValue}
                index={0}
                data-is-active={tabValue === 0}
              >
                {tempDisplay && (
                  <StickyTabPanelContentsContainer>
                    {/*搜索token*/}
                    <FilterContaienr>
                      <Search
                        value={search}
                        onChange={(event) => {
                          setSearch(event.currentTarget.value);
                        }}
                        placeholder={t('pages.index.searchPlaceholder')}
                        isPending={isDebouncing}
                        onClickFilter={() => {
                          setIsOpenSortBottomSheet(true);
                        }}
                        onClear={() => {
                          setSearch('');
                          cancel();
                        }}
                      />
                    </FilterContaienr>

                    {/*隐藏小额  管理token*/}
                    <ManageCryptoContainer>
                      <CheckBoxTextButton
                        isChecked={isHideSmalValue}
                        onClick={() => {
                          updateExtensionStorageStore('isHideSmalValue', !isHideSmalValue);
                        }}
                      >
                        <Typography variant="b3_R">{t('pages.index.hideSmallBalance')}</Typography>
                      </CheckBoxTextButton>
                      <IconTextButton
                        onClick={() => {
                          navigate({
                            to: ManageAssets.to,
                          });
                        }}
                        leadingIcon={<PlusIcon />}
                      >
                        <MarginLeftTypography variant="b3_M">{t('pages.index.manageCrypto')}</MarginLeftTypography>
                      </IconTextButton>
                    </ManageCryptoContainer>
                  </StickyTabPanelContentsContainer>
                )}
                <CoinButtonWrapper>
                  {isLoading ? (
                    <SkeletonCoinList />
                  ) : filteredAssets.length > 0 ? (
                    <VirtualizedList
                      items={filteredAssets}
                      estimateSize={() => 60}
                      renderItem={(coin, virtualItem) => {
                        if (!coin) return null;

                        const destinationRoute = coin.counts && gt(coin.counts, '1') ? CoinOverview.to : CoinDetail.to;

                        const isGroupToken = gt(coin.counts || '0', '1');
                        // const resolvedSymbol = coin.asset.symbol + `${isTestnetChain(coin.chain.id) ? ' (Testnet)' : ''}`;

                        const chainName = coin.chain.name;
                        const resolvedSymbol = coin.asset.symbol + `${isTestnetChain(coin.chain.id) ? `-(${chainName})` : ''}`;

                        return (
                          <CoinWithMarketTrendButton
                            key={getCoinId(coin.asset) + virtualItem.index}
                            onClick={() => {
                              navigate({
                                to: destinationRoute,
                                params: {
                                  coinId: getCoinId(coin.asset),
                                },
                              });
                            }}
                            displayAmount={Number(coin.totalDisplayAmount).toFixed(6) || '0'}
                            symbol={resolvedSymbol}
                            coinId={coin.asset.id}
                            coinGeckoId={coin.asset.coinGeckoId}
                            coinImageProps={{
                              imageURL: coin.asset.image ?? DefaultCoinImage,
                              isAggregatedCoin: gt(coin.counts || '0', '1'),
                              badgeImageURL: coin.chain.image || undefined,
                            }}
                          />
                        );
                      }}
                      overscan={5}
                    />
                  ) : (
                    <EmptyAssetContainer>
                      <img
                        src={CryptoEmpty}
                        alt="empty"
                        className="w-[52px] h-[70px] mt-[82px]"
                      />
                      <div className="mt-[26px] h-[16px] leading-[16px] text-[16px] text-white opacity-80">No Assets
                        Found
                      </div>
                    </EmptyAssetContainer>
                  )}
                </CoinButtonWrapper>
                <div className={'h-15'} />
              </StyledTabPanel>
              <StyledTabPanel
                value={tabValue}
                index={1}
                data-is-active={tabValue === 1}
              >
                <NFTList selectedChainId={selectedChainFilterId || undefined} />
              </StyledTabPanel>
              <SortBottomSheet
                optionButtonProps={[
                  {
                    sortKey: DASHBOARD_COIN_SORT_KEY.VALUE_HIGH_ORDER,
                    children: <Typography variant="b2_M">{t('pages.index.valueHighOrder')}</Typography>,
                  },
                  {
                    sortKey: DASHBOARD_COIN_SORT_KEY.ALPHABETICAL_ASC,
                    children: <Typography variant="b2_M">{t('pages.index.alphabeticalAsc')}</Typography>,
                  },
                ]}
                currentSortOption={dashboardCoinSortKey}
                open={isOpenSortBottomSheet}
                onClose={() => setIsOpenSortBottomSheet(false)}
                onSelectSortOption={(val) => {
                  updateExtensionStorageStore('dashboardCoinSortKey', val as DashboardCoinSortKeyType);
                }}
              />
            </Container>
          </EdgeAligner>
        </ScrollWrapper>
      </BaseBody>
      <CheckLegacyAddressBalanceBottomSheet />
    </>
  );
}
