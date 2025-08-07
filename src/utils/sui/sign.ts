import type { SuiTransactionBlockResponseOptions } from '@onelabs/sui/client';
import type { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import type { Transaction as TransactionTypeOct } from '@onelabs/sui/transactions';
import { Transaction as TransactionType } from '@mysten/sui/transactions';
import { getSuiClient } from '@/onechain/utils';

export async function signAndExecuteTxSequentially(
  signer: Ed25519Keypair,
  transaction: TransactionType | TransactionTypeOct,
  urls: string[],
  options?: SuiTransactionBlockResponseOptions,
) {

  // debugger;

  for (const url of urls) {
    const isSui = transaction instanceof TransactionType;
    const client = getSuiClient(!isSui, url);
    try {
      const response = await client.signAndExecuteTransaction({
        // @ts-expect-error
        signer: signer,
        // @ts-expect-error
        transaction: transaction,
        options: {
          ...options,
        },
      });

      return response;
    } catch (_) {
      console.error(_);
    }
  }
  throw new Error('All RPC URLs failed');
}

export async function signTxSequentially(signer: Ed25519Keypair, transaction: TransactionType | TransactionTypeOct, urls: string[]) {

  // debugger;

  for (const url of urls) {
    // const client = new SuiClient({ url });
    const isSui = transaction instanceof TransactionType;
    const client = getSuiClient(!isSui, url);

    try {
      // @ts-expect-error
      const encoded = await transaction.build({ client });

      const response = await signer.signTransaction(encoded);

      return response;
    } catch (_) {
      console.error(_);
    }
  }
  throw new Error('All RPC URLs failed');
}
