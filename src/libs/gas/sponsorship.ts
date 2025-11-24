import { createRequestInstance } from '@/onechain/api/request';
import { OneTransfer_API } from '@/onechain/api/oneTransferApi.ts';

const GAS_API_BASE_URL = `${OneTransfer_API}/api/ext`;

const gasClient = createRequestInstance(GAS_API_BASE_URL, 60000, {
  'Content-Type': 'application/json',
});

export interface GasSponsorCoin {
  objectId: string;
  version: string | number;
  digest: string;
}

export interface GasSponsorReservation {
  gas_coins: GasSponsorCoin[];
  reservation_id: string;
  sponsor_address: string;
}

export interface ExecuteSponsoredTxParams {
  reservationId: string;
  txBytes: string;
  userSignature: string;
}

function unwrapApiPayload<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Empty response from gas sponsorship API');
  }
  const payloadObj = payload as { data?: unknown; result?: unknown };

  if (payloadObj.result) {
    return payloadObj.result as T;
  }

  if (payloadObj.data && typeof payloadObj.data === 'object') {
    const dataLayer = payloadObj.data as { result?: unknown };
    if (dataLayer.result) {
      return dataLayer.result as T;
    }
    return payloadObj.data as T;
  }

  return payload as T;
}

export async function reserveSponsoredGas(
  gasBudget: number,
  reserveDurationSecs: number,
): Promise<GasSponsorReservation> {
  const MIN_GAS_BUDGET = 5_000_000_000; // 5 OCT
  const effectiveGasBudget = Math.max(gasBudget, MIN_GAS_BUDGET);
  const response = await gasClient.post('/gas/reserve', {
    gas_budget: effectiveGasBudget,
    reserve_duration_secs: reserveDurationSecs,
  });

  const reservation = unwrapApiPayload<GasSponsorReservation>(response);

  if (!reservation?.reservation_id) {
    throw new Error('Invalid gas reservation response. Missing reservation_id.');
  }

  return reservation;
}

export async function executeSponsoredTransaction(
  params: ExecuteSponsoredTxParams,
): Promise<Record<string, unknown>> {
  const response = await gasClient.post('/gas/executeTx', {
    reservation_id: params.reservationId,
    tx_bytes: params.txBytes,
    user_sig: params.userSignature,
  });

  const dataLayer = unwrapApiPayload<Record<string, unknown>>(response);

  if ('error' in dataLayer) {
    const possibleError = (dataLayer as { error?: unknown }).error;
    if (possibleError) {
      const message = typeof possibleError === 'string' ? possibleError : 'Sponsored execution failed';
      throw new Error(message);
    }
  }

  return dataLayer;
}
