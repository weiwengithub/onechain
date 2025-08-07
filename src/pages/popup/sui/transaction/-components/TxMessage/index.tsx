import type { Transaction as TransactionOct } from '@onelabs/sui/transactions';
import type { Transaction } from '@mysten/sui/transactions';

import DefaultTx from './messages/DefaultTx';

export type TxMessageProps = { tx: Transaction | TransactionOct };

export default function TxMessage({ tx }: TxMessageProps) {
  return <DefaultTx tx={tx} />;
}
