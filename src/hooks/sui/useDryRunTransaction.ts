import { Transaction as TransactionOct } from '@onelabs/sui/transactions';
import { Transaction } from '@mysten/sui/transactions';
import { toBase64 } from '@onelabs/sui/utils';
import type { SuiDryRunTransactionBlockResponse } from '@/types/sui/api';
import { isAxiosError, post } from '@/utils/axios';
import { useFetch, type UseFetchConfig } from '../common/useFetch';
import { useGetAccountAsset } from '../useGetAccountAsset';
import { getSuiClient } from '@/onechain/utils';

type UseDryRunTransactionProps = {
  coinId: string;
  transaction?: Transaction | TransactionOct | string | Uint8Array;
  config?: UseFetchConfig;
};

const getOriginTransaction = (isOct: boolean, transaction?: Transaction | TransactionOct | string | Uint8Array) => {
  let res = transaction;
  if (typeof transaction === 'string' || transaction instanceof Uint8Array) {
    res = isOct ? TransactionOct.from(transaction) : Transaction.from(transaction);
  }
  return res;
};

export function useDryRunTransaction({ coinId, transaction, config }: UseDryRunTransactionProps) {
  const isOct = coinId.includes('oct');
  const { getSuiAccountAsset } = useGetAccountAsset({ coinId });

  const accountAsset = getSuiAccountAsset();

  const rpcURLs = accountAsset?.chain.rpcUrls.map((item) => item.url) || [];

  const txObject = (() => {
    if (!transaction) return null;

    // const originTransaction = typeof transaction === 'string' || transaction instanceof Uint8Array ? Transaction.from(transaction) : transaction;

    const originTransaction = getOriginTransaction(isOct, transaction);

    // @ts-expect-error -- expect error
    return originTransaction.getData();
  })();

  const fetcher = async (index = 0) => {
    try {
      if (index >= rpcURLs.length) {
        throw new Error('All endpoints failed');
      }

      const requestURL = rpcURLs[index];

      // debugger;

      if (!transaction) {
        return null;
      }

      const client = getSuiClient(isOct, requestURL);

      // const originTransaction = typeof transaction === 'string' || transaction instanceof Uint8Array ? Transaction.from(transaction) : transaction;

      const originTransaction = getOriginTransaction(isOct, transaction);

      // @ts-expect-error -- expect error
      const buildedTransaction = await originTransaction.build({ client });

      const response = await post<SuiDryRunTransactionBlockResponse>(requestURL, {
        jsonrpc: '2.0',
        method: 'sui_dryRunTransactionBlock',
        params: [toBase64(buildedTransaction)],
        id: toBase64(buildedTransaction),
      });

      if (response.error) {
        throw new Error(`[RPC Error] URL: ${requestURL}, Method: sui_dryRunTransactionBlock, Message: ${response.error?.message}`);
      }

      return response;
    } catch (e) {
      if (index >= rpcURLs.length) {
        throw new Error('All endpoints failed');
      }

      if (isAxiosError(e)) {
        if (e.response?.status === 404) {
          return null;
        }
      }

      return fetcher(index + 1);
    }
  };

  const { data, isLoading, isFetching, error } = useFetch({
    queryKey: ['useDryRunTransactionBlock', coinId, txObject, transaction],
    fetchFunction: () => fetcher(),
    config: {
      enabled: !!coinId && !!rpcURLs.length && !!transaction,
      ...config,
    },
  });

  return { data, isLoading, isFetching, error };
}
