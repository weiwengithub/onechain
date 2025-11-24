import { useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import { FilledTab, FilledTabs } from '@/components/common/FilledTab';
import Search from '@/components/Search';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { useNewSortedAccountStore } from '@/zustand/hooks/useNewSortedAccountStore';
import { useSwitchTapStore } from '@/zustand/hooks/useSwitchTabStore';

import DraggableMnemonicAccountList from './-components/DraggableMnemonicAccountList';
import DraggablePrivateKeyAccountList from './-components/DraggablePrivateKeyAccountList';
import DraggableZkLoginAccountList from './-components/DraggableZkLoginAccountList';
import {
  CoinContainer,
  ManageWalletAndAccountBody,
  SearchContainer,
  StickyTabContainer,
  StyledTabPanel,
  TabPanelContentsContainer,
} from './-styled';

import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { useOctPrice } from '@/onechain/useOctPrice.ts';
import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice';
import { getFilteredAssetsByChainId, isStakeableAsset } from '@/utils/asset.ts';
import { plus, times, toDisplayDenomAmount } from '@/utils/numbers.ts';

export default function Entry() {
  const { t } = useTranslation();
  const tempDisplay = false;
  const { resetNewSortedAccount } = useNewSortedAccountStore((state) => state);
  const { manageAccountTapIndex, updatedManateAccountTabIndex } = useSwitchTapStore((state) => state);
  const { userAccounts } = useExtensionStorageStore((state) => state);

  const tabLabels = [
    t('pages.manage-account.manage-wallet-and-account.entry.mnemonicTab'),
    t('pages.manage-account.manage-wallet-and-account.entry.zkLoginTab'),
    t('pages.manage-account.manage-wallet-and-account.entry.privateKeyTab'),
  ];

  const [search, setSearch] = useState('');
  const [debouncedSearch, { cancel, isPending }] = useDebounce(search, 300);

  const isDebouncing = !!search && isPending();

  const searchText = useMemo(() => (!!search && debouncedSearch.length > 1 ? debouncedSearch : ''), [debouncedSearch, search]);

  const handleChange = (_: React.SyntheticEvent, newTabValue: number) => {
    updatedManateAccountTabIndex(newTabValue);
  };

  const uniqueMnemonicRestoreString = userAccounts
    .filter((item) => item.type === 'MNEMONIC')
    .map((account) => account.encryptedRestoreString)
    .filter((value, index, self) => self.indexOf(value) === index);

  const privateKeyAccountIds = userAccounts.filter((item) => item.type === 'PRIVATE_KEY').map((account) => account.id);

  const zkLoginAccounts = userAccounts.filter((item) => item.type === 'ZKLOGIN');

  // Debug: Log zkLogin accounts changes
  useEffect(() => {
    console.log('zkLoginAccounts count:', zkLoginAccounts.length);
    if (zkLoginAccounts.length !== userAccounts.filter(acc => acc.type === 'ZKLOGIN').length) {
      console.warn('zkLoginAccounts filtering issue detected!');
    }
  }, [zkLoginAccounts, userAccounts]);

  // Remove the reset call that was clearing sort data on every component mount
  // This was causing the zkLoginAccountIds to be reset to empty array
  // useEffect(() => {
  //   resetNewSortedAccount();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
  });
  const { priceInfo } = useOctPrice();
  const { data: coinGeckoPrice, isLoading } = useCoinGeckoPrice();
  const { userCurrencyPreference } = useExtensionStorageStore((state) => state);
  const [aggregatedTotalValue, setAggregatedTotalValue] = useState('0');
  useEffect(() => {

    if (!accountAllAssets?.flatAccountAssets || accountAllAssets.flatAccountAssets.length === 0) {
      return;
    }

    const filteredAssetsByChainId = getFilteredAssetsByChainId(accountAllAssets?.flatAccountAssets);

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
  }, [priceInfo, accountAllAssets, coinGeckoPrice, userCurrencyPreference, isLoading]);

  return (
    <>
      <BaseBody>
        <EdgeAligner>
          <CoinContainer>
            <StickyTabContainer>
              <div className="h-[20px] text-[14px] text-white leading-[20px]">
                {t('pages.manage-account.manage-wallet-and-account.entry.totalAssets')}
              </div>
              <div className="mt-[5px] h-[32px] text-[28px] text-white font-bold leading-[32px]">
                {t('pages.manage-account.manage-wallet-and-account.entry.totalAssetsValue', { value: aggregatedTotalValue })}
              </div>
            </StickyTabContainer>

            <div className="pt-[12px]">
              <FilledTabs value={manageAccountTapIndex} onChange={handleChange} variant="fullWidth">
                {tabLabels.map((item) => (
                  <FilledTab key={item} label={item} />
                ))}
              </FilledTabs>

              {tempDisplay && (
                <SearchContainer>
                  <Search
                    value={search}
                    onChange={(event) => {
                      setSearch(event.currentTarget.value);
                    }}
                    isPending={isDebouncing}
                    placeholder={t('pages.manage-account.manage-wallet-and-account.entry.searchPlaceholder')}
                    disableFilter
                    onClear={() => {
                      setSearch('');
                      cancel();
                    }}
                  />
                </SearchContainer>
              )}
            </div>

            <ManageWalletAndAccountBody>
              <StyledTabPanel value={manageAccountTapIndex} index={0}>
                <TabPanelContentsContainer>
                  <DndProvider backend={HTML5Backend}>
                    <DraggableMnemonicAccountList
                      uniqueMnemonicRestoreStrings={uniqueMnemonicRestoreString} search={searchText}
                    />
                  </DndProvider>
                </TabPanelContentsContainer>
              </StyledTabPanel>

              <StyledTabPanel value={manageAccountTapIndex} index={1}>
                <TabPanelContentsContainer>
                  <DndProvider backend={HTML5Backend}>
                    <DraggableZkLoginAccountList zkLoginAccounts={zkLoginAccounts} search={searchText} />
                  </DndProvider>
                </TabPanelContentsContainer>
              </StyledTabPanel>

              <StyledTabPanel value={manageAccountTapIndex} index={2}>
                <TabPanelContentsContainer>
                  <DndProvider backend={HTML5Backend}>
                    <DraggablePrivateKeyAccountList privateKeyAccountIds={privateKeyAccountIds} search={searchText} />
                  </DndProvider>
                </TabPanelContentsContainer>
              </StyledTabPanel>
            </ManageWalletAndAccountBody>
          </CoinContainer>
        </EdgeAligner>
      </BaseBody>
    </>
  );
}
