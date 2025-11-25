import type { Transaction } from '@mysten/sui/transactions';
import type { Transaction as TransactionOct } from '@onelabs/sui/transactions';

import type { VoucherSigningContext } from '@/types/voucher';
import { reserveSponsoredGas, executeSponsoredTransaction } from '@/libs/gas/sponsorship';

export interface SponsoredExecutionDeps {
  gasBudgetValue: number;
  reserveDurationSecs: number;
  getSenderAddress: (signer: any) => Promise<string>;
  signTransactionBytes: (
    tx: Transaction | TransactionOct,
    signingContext: VoucherSigningContext,
  ) => Promise<{ bytes: Uint8Array | string; signature: string; }>;
  normalizeExecutionResult: (result: unknown) => Record<string, unknown>;
}

const toBase64 = (bytes: Uint8Array | string): string =>
  typeof bytes === 'string'
    ? bytes
    : Buffer.from(bytes).toString('base64');

export function shouldUseSponsoredGas(enabled: boolean, gasBudgetValue: number): boolean {
  return enabled && gasBudgetValue > 0;
}

export function isExecutionFailureError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (!message) {
    return false;
  }

  const lowerMsg = message.toLowerCase();
  return (
    lowerMsg.includes('moveabort') ||
    lowerMsg.includes('execution failed') ||
    lowerMsg.includes('transaction execution failed') ||
    (lowerMsg.includes('status') && lowerMsg.includes('failure'))
  );
}

export async function executeWithSponsoredGas(
  tx: Transaction | TransactionOct,
  signingContext: VoucherSigningContext,
  deps: SponsoredExecutionDeps,
  minGasBudget?: number,
): Promise<Record<string, unknown>> {
  const senderAddress = await deps.getSenderAddress(signingContext.signer);
  tx.setSender(senderAddress);

  const requiredBudget = Math.max(deps.gasBudgetValue, minGasBudget ?? 0);
  const reservation = await reserveSponsoredGas(requiredBudget, deps.reserveDurationSecs);

  tx.setGasOwner(reservation.sponsor_address);
  tx.setGasPayment(reservation.gas_coins);
  tx.setGasBudget(requiredBudget);

  const { bytes, signature } = await deps.signTransactionBytes(tx, signingContext);
  const txBytesBase64 = toBase64(bytes);

  const executionResult = await executeSponsoredTransaction({
    reservationId: reservation.reservation_id,
    txBytes: txBytesBase64,
    userSignature: signature,
  });

  return deps.normalizeExecutionResult(executionResult);
}
