
// import { cn } from '@/utils/date.ts';
// import SearchIcon from "@/assets/img/icon/search.png";
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import { DEFAULT_MAJOR_CHAINS } from '@/constants/common';
import { CHAINLIST_SORT_KEY } from '@/constants/sortKey';
import { usePortfolioValuesByChain } from '@/hooks/current/usePortfolioValuesByChain';
import type { ChainBase, UniqueChainId } from '@/types/chain';
import { isTestnetChain } from '@/utils/chain';
import { equal, minus, plus } from '@/utils/numbers';
import { getUniqueChainId, isMatchingUniqueChainId, isSameChain } from '@/utils/queryParamGenerator';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import {
  Body,
  Container,
  FilterContaienr,
} from './-styled';
import BaseBody from '@/components/BaseLayout/components/BaseBody';
import Search from './-components/Search';
import OptionButton from './-components/OptionButton';

import AllNetworkImage from '@/assets/images/network.png';

import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { getFilteredChainsByChainId } from '@/utils/asset';
import { useRouter } from '@tanstack/react-router';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { isZkLoginAccount, isSupportedZkLoginChain } from '@/utils/zklogin';

interface ChainWithValue extends ChainBase {
  isActive: boolean;
  value: string;
}

interface CategorizedChain {
  testnet: ChainWithValue[];
  mainnet: ChainWithValue[];
}

export default function Entry() {

  const { t } = useTranslation();
  const { history } = useRouter();
  const ref = useRef<HTMLButtonElement>(null);
  const { chainListSortKey } = useExtensionStorageStore((state) => state);

  const { userCurrencyPreference, selectedChainFilterId, updateExtensionStorageStore } = useExtensionStorageStore(
    (state) => state,
  );

  console.log(userCurrencyPreference);
  const currentChainId = selectedChainFilterId as UniqueChainId;
  const disableSort = false;
  const isShowValue = false;

  const [search, setSearch] = useState('');
  const [debouncedSearch, { cancel, isPending }] = useDebounce(search, 300);

  const isDebouncing = !!search && isPending();

  const AllNetworkOptionId = undefined;

  const { portfolioValuesByChain } = usePortfolioValuesByChain();

  const totalValue = isShowValue
    ? portfolioValuesByChain.reduce((acc, item) => {
      return plus(acc, item.totalValue);
    }, '0')
    : '0';

  const { currentAccount } = useCurrentAccount();
  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
  });

  const chainList = useMemo(() => {
    const allChains = getFilteredChainsByChainId(accountAllAssets?.flatAccountAssets);

    // 如果是 ZkLogin 账户，只显示支持的网络
    if (currentAccount && isZkLoginAccount(currentAccount)) {
      return allChains.filter(chain => {
        const chainId = getUniqueChainId(chain);
        return isSupportedZkLoginChain(chainId);
      });
    }

    return allChains;
  }, [accountAllAssets?.flatAccountAssets, currentAccount]);

  const categorizedChainsWithValue = useMemo(() => {
    return chainList.reduce(
      (acc: CategorizedChain, item) => {
        const isActive = isMatchingUniqueChainId(item, currentChainId);
        const value = portfolioValuesByChain.find((chain) => isSameChain(chain.chain, item));

        const chainWithValue: ChainWithValue = {
          ...item,
          isActive: isActive,
          value: value?.totalValue || '0',
        };

        (isTestnetChain(chainWithValue.id) ? acc.testnet : acc.mainnet).push(chainWithValue);

        return acc;
      },
      { testnet: [], mainnet: [] },
    );
  }, [chainList, currentChainId, portfolioValuesByChain]);

  const sortedChainList = useMemo(
    () =>
      disableSort
        ? categorizedChainsWithValue
        : {
          testnet: [...categorizedChainsWithValue.testnet].sort((a, b) => {
            return a.name.localeCompare(b.name);
          }),
          mainnet: [...categorizedChainsWithValue.mainnet].sort((a, b) => {
            const aIndex = DEFAULT_MAJOR_CHAINS.findIndex((defaultChain) => isSameChain(defaultChain, a));
            const bIndex = DEFAULT_MAJOR_CHAINS.findIndex((defaultChain) => isSameChain(defaultChain, b));

            if (aIndex !== -1 || bIndex !== -1) {
              return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex);
            }

            if (chainListSortKey === CHAINLIST_SORT_KEY.VALUE_HIGH_ORDER) {
              if (equal(b.value, a.value)) {
                return a.name.localeCompare(b.name);
              }

              return Number(minus(b.value, a.value));
            }

            if (chainListSortKey === CHAINLIST_SORT_KEY.ALPHABETICAL_ASC) {
              return a.name.localeCompare(b.name);
            }

            return 0;
          }),
        },

    [chainListSortKey, disableSort, categorizedChainsWithValue],
  );

  const filteredChainList = useMemo(() => {
    if (!!search && debouncedSearch.length > 1) {
      return {
        testnet: sortedChainList.testnet?.filter((chain) => chain.name.toLowerCase().indexOf(debouncedSearch.toLowerCase()) > -1),
        mainnet: sortedChainList.mainnet?.filter((chain) => chain.name.toLowerCase().indexOf(debouncedSearch.toLowerCase()) > -1),
      };
    }
    return sortedChainList;
  }, [debouncedSearch, search, sortedChainList]);

  const handleClose = () => {
    setSearch('');
    history.back();
  };

  return (
    <BaseBody>
      <Container>
        <FilterContaienr>
          <Search
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
            }}
            searchPlaceholder="Search"
            isPending={isDebouncing}
            onClear={() => {
              setSearch('');
              cancel();
            }}
          />
        </FilterContaienr>
        <Body>
          {!isDebouncing && (
            <OptionButton
              key={'all-network'}
              isActive={!currentChainId}
              onSelectChain={(id) => {
                updateExtensionStorageStore('selectedChainFilterId', id || null);
                handleClose();
              }}
              name={t('components.ChainListBottomSheet.index.allNetwork')}
              image={AllNetworkImage}
              id={AllNetworkOptionId}
              isShowValue={isShowValue}
              totalValue={totalValue}
            />
          )}
          {!isDebouncing &&
            filteredChainList.mainnet?.length > 0 &&
            filteredChainList.mainnet.map((item) => {
              return (
                <OptionButton
                  key={getUniqueChainId(item)}
                  isActive={item.isActive}
                  ref={item.isActive ? ref : undefined}
                  onSelectChain={(id) => {
                    updateExtensionStorageStore('selectedChainFilterId', id || null);
                    handleClose();
                  }}
                  name={item.name}
                  image={item.image}
                  id={getUniqueChainId(item)}
                  isShowValue={isShowValue}
                  totalValue={item.value}
                />
              );
            })}

          {!isDebouncing &&
            filteredChainList.testnet?.length > 0 &&
            filteredChainList.testnet.map((item) => {
              return (
                <OptionButton
                  key={getUniqueChainId(item)}
                  isActive={item.isActive}
                  ref={item.isActive ? ref : undefined}
                  onSelectChain={(id) => {
                    updateExtensionStorageStore('selectedChainFilterId', id || null);
                    handleClose();
                  }}
                  name={item.name}
                  image={item.image}
                  id={getUniqueChainId(item)}
                  isShowValue={isShowValue}
                  totalValue={item.value}
                />
              );
            })}
        </Body>
      </Container>
    </BaseBody>
  );
}
