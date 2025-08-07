import { useEffect, useMemo, useState } from 'react';
// import { t } from 'i18next';
import { useDebounce } from 'use-debounce';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
// import { FilledTab, FilledTabs } from '@/components/common/FilledTab';
// import Search from '@/components/Search';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useSwitchTapStore } from '@/zustand/hooks/useSwitchTabStore';

import MnemonicAccount from './-components/MnemonicAccount';
import PrivateKeyAccount from './-components/PrivateKeyAccount';
import { StickyTabContainer, StyledTabPanel, TabPanelContentsContainer } from './-styled';
import { getFilteredAssetsByChainId, isStakeableAsset } from '@/utils/asset.ts';
import { plus, times, toDisplayDenomAmount } from '@/utils/numbers.ts';

import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { useOctPrice } from '@/onechain/useOctPrice.ts';
import { useCoinGeckoPrice } from '@/hooks/useCoinGeckoPrice';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

export default function Entry() {
  const { manageAccountTapIndex, updatedManateAccountTabIndex } = useSwitchTapStore((state) => state);
  const { currentAccount } = useCurrentAccount();

  const isMnemonicAccount = currentAccount.type === 'MNEMONIC';
  // const tabLabels = ['Mnenmonic', 'Private Key'];

  const [search] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);

  // const isDebouncing = !!search && isPending();

  const searchText = useMemo(() => (!!search && debouncedSearch.length > 1 ? debouncedSearch : ''), [debouncedSearch, search]);

  // const handleChange = (_: React.SyntheticEvent, newTabValue: number) => {
  //   updatedManateAccountTabIndex(newTabValue);
  // };

  useEffect(() => {
    if (isMnemonicAccount) {
      updatedManateAccountTabIndex(0);
    } else {
      updatedManateAccountTabIndex(1);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
  });
  const {priceInfo} = useOctPrice();
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
      }
      else if (coinGeckoId.startsWith('oct')) {
        const coinId = item.asset.id;
        coinPrice = priceInfo[coinId]?.octPrice ?? 0;
      }else {
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
  }, [priceInfo, accountAllAssets, coinGeckoPrice, userCurrencyPreference, isLoading]);
  return (
    <BaseBody>
      <EdgeAligner>
        <StickyTabContainer>
          <div>
            <div className="h-[20px] text-[14px] text-white leading-[20px]">Total assets</div>
            <div className="mt-[5px] h-[32px] text-[28px] text-white font-bold leading-[32px]">${aggregatedTotalValue}</div>
          </div>
        </StickyTabContainer>
        <StyledTabPanel value={manageAccountTapIndex} index={0}>
          <TabPanelContentsContainer>
            <MnemonicAccount search={searchText} />
          </TabPanelContentsContainer>
        </StyledTabPanel>
        <StyledTabPanel value={manageAccountTapIndex} index={1}>
          <TabPanelContentsContainer>
            <PrivateKeyAccount search={searchText} />
          </TabPanelContentsContainer>
        </StyledTabPanel>
      </EdgeAligner>
    </BaseBody>
  );
}
