import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { InfiniteVirtualizedList } from '@/components/common/InfiniteVirtualizedList';
import ListLoading from '@/components/Loading/ListLoading';
import { OCT_COIN_TYPE, SUI_COIN_TYPE } from '@/constants/sui';
import { useAccountTxs } from '@/hooks/sui/useAccountTxs';
import { formatDateForHistory } from '@/utils/date';

import SuiTxItem from './components/SuiTxItem';
import { Container, ContentsContainer, DateLineContainer, EmptyAssetContainer, TxDetailContainer } from './styled';
import DateLine from '../Common/DateLine';

import EmptyIcon from '@/assets/img/icon/transactions_empty.png';

type SuiAccountTxHistory = {
  coinId: string;
};

export default function SuiAccountTxHistory({ coinId }: SuiAccountTxHistory) {
  const { t } = useTranslation();

  const { formattedTxBlocks, error, isFetchingNextPage, hasNextPage, fetchNextPage, isLoading } = useAccountTxs({
    coinId: coinId,
  });

  const coinIdType = useMemo(() => {
    return coinId.split('__')[0];
  }, [coinId]);

  const formattedTxBlocks2 = useMemo(() => {
    return formattedTxBlocks.filter((item) => {
      const { ownerBalanceChanges } = item.analyzedTransaction;

      // 如果没有 ownerBalanceChanges，剔除该项
      if (!ownerBalanceChanges) {
        return false;
      }

      const balanceChangeEntries = Object.entries(ownerBalanceChanges);

      // 如果 coinIdType 为 SUI_COIN_TYPE 或 OCT_COIN_TYPE，则必须满足所有 key 都和 coinIdType 一致
      if (coinIdType === SUI_COIN_TYPE || coinIdType === OCT_COIN_TYPE) {
        const allKeysMatch = balanceChangeEntries.every(([key]) => key === coinIdType);
        if (!allKeysMatch) {
          return false;
        }
      }

      // 仅有一项，且 key 和 coinIdType 一致，同时 value 不为 0 时，保留该项
      if (balanceChangeEntries.length === 1) {
        const [key, value] = balanceChangeEntries[0];
        return key === coinIdType && value !== '0';
      }

      // 有多项，且 key 和 coinIdType 一致时，value 不为 0，保留该项
      if (balanceChangeEntries.length > 1) {
        const matchingEntry = balanceChangeEntries.find(([key]) => key === coinIdType);
        if (matchingEntry) {
          const [, value] = matchingEntry;
          return value !== '0';
        }
      }

      // 其他情况则剔除
      return false;
    });
  }, [formattedTxBlocks, coinIdType]);

  // debugger;

  const txsGroupedByDate = (() => {
    const formattedDates = formattedTxBlocks2
      .map((item) => (item.analyzedTransaction.timestampMs ? formatDateForHistory(item.analyzedTransaction.timestampMs) : ''))
      .filter((item) => !!item);

    const uniqueFormattedDates = formattedDates.filter((v, i, a) => a.indexOf(v) === i);

    return uniqueFormattedDates.map((uniqueFormattedDate) => {
      const filteredActivites = formattedTxBlocks2.filter((tx) => {
        if (!tx.analyzedTransaction.timestampMs) {
          return false;
        }

        return formatDateForHistory(tx.analyzedTransaction.timestampMs) === uniqueFormattedDate;
      });

      return {
        [uniqueFormattedDate]: filteredActivites,
      };
    });
  })();

  const isExistTxHistory = !!txsGroupedByDate.length;

  // console.log('      txsGroupedByDate', txsGroupedByDate);

  return (
    <Container>
      {isExistTxHistory ? (
        <ContentsContainer>
          <InfiniteVirtualizedList
            items={txsGroupedByDate}
            estimateSize={() => 60}
            renderItem={(item) => {
              // console.log('      txsGroupedByDate item');
              // console.log(JSON.stringify(item, null, 2));

              const date = Object.keys(item)[0];
              const txsByDate = item[date];

              return (
                <ContentsContainer key={date}>
                  <DateLineContainer>
                    <DateLine date={date} />
                  </DateLineContainer>
                  <TxDetailContainer>
                    {txsByDate.map((tx) => {
                      return (
                        <SuiTxItem
                          key={tx.analyzedTransaction.digest}
                          coinId={coinId}
                          tx={tx.analyzedTransaction}
                        />
                      );
                    })}
                  </TxDetailContainer>
                </ContentsContainer>
              );
            }}
            overscan={10}
            fetchNextPage={fetchNextPage}
            hasNextPage={!isFetchingNextPage && hasNextPage && !error}
            isFetchingNextPage={isFetchingNextPage}
          />
        </ContentsContainer>
      ) : (
        <EmptyAssetContainer>
          {isLoading ? (
            <ListLoading
              title={t('components.AccountTxHistory.components.Sui.index.LoadingTitle')}
              subTitle={t('components.AccountTxHistory.components.Sui.index.LoadingSubTitle')}
            />
          ) : (
            <div className="mt-[56px]">
              <img
                src={EmptyIcon}
                alt="empty"
                className="mx-auto h-[80px]"
              />
              <div className="mt-[24px] h-[16px] text-center text-[14px] leading-[16px] text-white opacity-80">No
                transactions found
              </div>
            </div>
          )}
        </EmptyAssetContainer>
      )}
    </Container>
  );
}
