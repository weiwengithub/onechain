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
  const { t, i18n } = useTranslation();

  const { formattedTxBlocks, error, isFetchingNextPage, hasNextPage, fetchNextPage, isLoading } = useAccountTxs({
    coinId: coinId,
  });

  const coinIdType = useMemo(() => {
    return coinId.split('__')[0];
  }, [coinId]);

  const formattedTxBlocks2 = useMemo(() => {
    return formattedTxBlocks.filter((item) => {
      const { ownerBalanceChanges, important } = item.analyzedTransaction;

      // 如果没有余额变化，过滤掉无余额变化的交易
      if (!ownerBalanceChanges) {
        return false;
      }

      const balanceChangeEntries = Object.entries(ownerBalanceChanges);

      // 对于特定代币，只显示该代币相关的交易
      // 检查是否至少有一个余额变化与当前代币类型相关，且变化量不为 "0"
      const hasRelevantChange = balanceChangeEntries.some(([key, value]) => {
        return key === coinIdType && value !== "0";
      });

      // 如果是查看特定代币的交易历史，只显示与该代币相关的交易
      if (coinIdType !== SUI_COIN_TYPE && coinIdType !== OCT_COIN_TYPE) {
        return hasRelevantChange;
      }

      // 对于SUI/OCT代币，使用原有逻辑
      if (coinIdType === SUI_COIN_TYPE || coinIdType === OCT_COIN_TYPE) {
        // 检查 sending 操作是否涉及当前 token
        const hasRelevantSending = important.sending && important.sending.length > 0 &&
          important.sending.some(send => send.coinType === coinIdType);

        // 方案2：如果交易有重要操作，直接显示
        if (important && (
          (important.staking && important.staking.length > 0) ||
          hasRelevantSending ||
          (important.moveCalls && important.moveCalls.length > 0) ||
          important.faucet
        )) {
          return true;
        }

        // 检查是否有相关的余额变化
        return hasRelevantChange;
      }

      return false;
    });
  }, [formattedTxBlocks, coinIdType]);

  const txsGroupedByDate = (() => {
    const formattedDates = formattedTxBlocks2
      .map((item) =>
        item.analyzedTransaction.timestampMs
          ? formatDateForHistory(item.analyzedTransaction.timestampMs, i18n.language)
          : '',
      )
      .filter((item) => !!item);

    const uniqueFormattedDates = formattedDates.filter((v, i, a) => a.indexOf(v) === i);

    return uniqueFormattedDates.map((uniqueFormattedDate) => {
      const filteredActivites = formattedTxBlocks2.filter((tx) => {
        if (!tx.analyzedTransaction.timestampMs) {
          return false;
        }

        return formatDateForHistory(tx.analyzedTransaction.timestampMs, i18n.language) === uniqueFormattedDate;
      });

      return {
        [uniqueFormattedDate]: filteredActivites,
      };
    });
  })();

  const isExistTxHistory = !!txsGroupedByDate.length;

  console.log('      txsGroupedByDate', txsGroupedByDate);

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
              <div className="mt-[24px] h-[16px] text-center text-[14px] leading-[16px] text-white opacity-80">
                {t('components.AccountTxHistory.components.Sui.index.noTransactionsFound')}
              </div>
            </div>
          )}
        </EmptyAssetContainer>
      )}
    </Container>
  );
}
