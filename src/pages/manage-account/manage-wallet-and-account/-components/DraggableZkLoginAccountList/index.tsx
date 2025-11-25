import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';
import { produce } from 'immer';

import EmptyAsset from '@/components/EmptyAsset';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { useNewSortedAccountStore } from '@/zustand/hooks/useNewSortedAccountStore';
import type { ZkLoginAccount } from '@/types/account';

import DraggableZkLoginAccountItem from './components/DraggableZkLoginAccountItem';
import { EmptyAssetContainer, ListContainer } from './styled';

import ImportPrivateKeyIcon from '@/assets/images/icons/ImportPrivateKey70.svg';

export const ZKLOGIN_ACCOUNT_DND_ITEM_TYPE = {
  ZKLOGIN_CARD: 'zklogin-card',
} as const;

type DraggableZkLoginAccountListProps = {
  zkLoginAccounts: ZkLoginAccount[];
  search?: string;
};

export type IndexedZkLoginAccount = {
  index: number;
  accountId: string;
  accountName: string;
  address: string;
  provider: 'google' | 'apple';
};

export default function DraggableZkLoginAccountList({ zkLoginAccounts, search }: DraggableZkLoginAccountListProps) {
  const { t } = useTranslation();
  const {
    zkLoginAccountIds: newSortedZkLoginAccountIds,
    updatedNewSortedZkLoginAccounts,
  } = useNewSortedAccountStore((state) => state);
  const { accountNamesById } = useExtensionStorageStore((state) => state);

  const [indexedAccounts, setIndexedAccounts] = useState<IndexedZkLoginAccount[]>(
    newSortedZkLoginAccountIds.length > 0
      ? newSortedZkLoginAccountIds.map((item, idx) => {
        const account = zkLoginAccounts.find(acc => acc.id === item);
        return {
          index: idx,
          accountId: item,
          accountName: accountNamesById[item] ?? '',
          address: account?.address ?? '',
          provider: account?.provider ?? 'google',
        };
      })
      : zkLoginAccounts.map((item, idx) => ({
        index: idx,
        accountId: item.id,
        accountName: accountNamesById[item.id] ?? '',
        address: item.address,
        provider: item.provider ?? 'google',
      })),
  );

  // Update indexedAccounts when zkLoginAccounts changes
  useEffect(() => {
    console.log('Building indexed accounts - zkLogin count:', zkLoginAccounts.length, 'sorted IDs:', newSortedZkLoginAccountIds.length);

    // Build indexed accounts based on current zkLoginAccounts
    // If we have sorted order, try to use it, but prioritize actual account existence
    let newIndexedAccounts: IndexedZkLoginAccount[];

    if (newSortedZkLoginAccountIds.length > 0) {
      // Create a map of existing accounts for fast lookup
      const accountMap = new Map(zkLoginAccounts.map(acc => [acc.id, acc]));

      // Start with sorted accounts that still exist
      const sortedExistingAccounts = newSortedZkLoginAccountIds
        .map((id, idx) => {
          const account = accountMap.get(id);
          if (account) {
            return {
              index: idx,
              accountId: id,
              accountName: accountNamesById[id] ?? '',
              address: account.address,
              provider: account.provider ?? 'google',
            };
          }
          console.log(`Sorted ID ${id} not found in current accounts`);
          return null;
        })
        .filter((item): item is IndexedZkLoginAccount => item !== null);

      // Add any new accounts that aren't in the sorted list
      const sortedIds = new Set(newSortedZkLoginAccountIds);
      const newAccounts = zkLoginAccounts
        .filter(acc => !sortedIds.has(acc.id))
        .map((item, idx) => {
          return {
            index: sortedExistingAccounts.length + idx,
            accountId: item.id,
            accountName: accountNamesById[item.id] ?? '',
            address: item.address,
            provider: item.provider ?? 'google',
          };
        });

      newIndexedAccounts = [...sortedExistingAccounts, ...newAccounts];
    } else {
      // No sort order, use natural order
      newIndexedAccounts = zkLoginAccounts.map((item, idx) => {
        return {
          index: idx,
          accountId: item.id,
          accountName: accountNamesById[item.id] ?? '',
          address: item.address,
          provider: item.provider ?? 'google',
        };
      });
    }

    console.log('Final indexed accounts count:', newIndexedAccounts.length);

    setIndexedAccounts(newIndexedAccounts);
  }, [zkLoginAccounts, accountNamesById, newSortedZkLoginAccountIds]);

  const findAccountItem = useCallback(
    (id: number) => {
      const index = indexedAccounts.findIndex((c) => c.index === id);
      return {
        cardItem: indexedAccounts[index],
        index,
      };
    },
    [indexedAccounts],
  );

  const moveAccountItem = useCallback((id: number, atIndex: number) => {
    setIndexedAccounts((prevAccounts) => {
      const index = prevAccounts.findIndex((item) => item.index === id);
      if (index === -1 || index === atIndex) return prevAccounts;

      return produce(prevAccounts, (draft) => {
        const [movedItem] = draft.splice(index, 1);
        draft.splice(atIndex, 0, movedItem);
      });
    });
  }, []);

  const [, drop] = useDrop(() => ({ accept: ZKLOGIN_ACCOUNT_DND_ITEM_TYPE.ZKLOGIN_CARD }));

  const filteredAccounts = useMemo(() => {
    if (search) {
      return (
        indexedAccounts.filter((account) => {
          const condition = [account.accountName, account.address];

          return condition.some((item) => item.toLowerCase().indexOf(search.toLowerCase()) > -1);
        }) || []
      );
    }
    return indexedAccounts;
  }, [indexedAccounts, search]);

  // Initialize sorted account IDs if empty but we have accounts
  useEffect(() => {
    if (newSortedZkLoginAccountIds.length === 0 && zkLoginAccounts.length > 0) {
      console.log('Initializing sorted account IDs for', zkLoginAccounts.length, 'accounts');
      updatedNewSortedZkLoginAccounts(zkLoginAccounts.map((item) => item.id));
    }
  }, [zkLoginAccounts, newSortedZkLoginAccountIds, updatedNewSortedZkLoginAccounts]);

  // Update store when indexed accounts change (for drag/drop reordering)
  useEffect(() => {
    if (
      indexedAccounts.length > 0 && (
        newSortedZkLoginAccountIds.length !== indexedAccounts.length ||
        newSortedZkLoginAccountIds.some((item, idx) => item !== indexedAccounts[idx].accountId)
      )
    ) {
      console.log('Updating sorted account store with new order');
      updatedNewSortedZkLoginAccounts(indexedAccounts.map((item) => item.accountId));
    }
  }, [indexedAccounts, newSortedZkLoginAccountIds, updatedNewSortedZkLoginAccounts]);

  if (search && filteredAccounts.length === 0) {
    return (
      <EmptyAssetContainer>
        <EmptyAsset
          icon={<ImportPrivateKeyIcon />}
          title={t('pages.manage-account.manage-wallet-and-account.entry.addZkLoginAccount')}
          subTitle={t('pages.manage-account.manage-wallet-and-account.entry.addZkLoginAccountDescription')}
        />
      </EmptyAssetContainer>
    );
  }

  if (search) {
    return (
      <ListContainer ref={drop}>
        {filteredAccounts.map((account) => (
          <DraggableZkLoginAccountItem
            key={account.accountId}
            draggableItem={account}
            moveAccountItem={moveAccountItem}
            findAccountItem={findAccountItem}
            itemIndex={account.index}
            blockDrag
          />
        ))}
      </ListContainer>
    );
  } else {
    return (
      <ListContainer ref={drop}>
        {indexedAccounts.map((account) => (
          <DraggableZkLoginAccountItem
            key={account.accountId}
            draggableItem={account}
            moveAccountItem={moveAccountItem}
            findAccountItem={findAccountItem}
            itemIndex={account.index}
          />
        ))}
      </ListContainer>
    );
  }
}
