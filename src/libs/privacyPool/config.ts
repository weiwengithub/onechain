import type { SuiMoveObject } from '@mysten/sui/client';
import { getVoucherRpcUrl, VOUCHER_CONFIG } from '@/constants/voucher';
import { getSuiClient } from '@/onechain/utils';

export interface PrivacyPoolOnChainConfig {
  noteDenomination: bigint;
  depositFixedFee: bigint;
  depositFeeBps: number;
  withdrawFixedFee: bigint;
  withdrawFeeBps: number;
}

const FEE_BPS_DENOMINATOR = 10_000n;

/**
 * 计算链上配置定义的手续费
 */
export function calculatePoolFee(
  noteAmount: bigint | number,
  fixedFee: bigint | number,
  feeBps: number,
): bigint {
  const note = BigInt(noteAmount);
  const fixed = BigInt(fixedFee);
  if (feeBps <= 0) {
    return fixed;
  }

  return fixed + (note * BigInt(feeBps)) / FEE_BPS_DENOMINATOR;
}

/**
 * 获取链上的 Privacy Pool 配置
 */
export async function fetchPrivacyPoolConfig(
  network: 'oct' | 'oct-testnet',
): Promise<PrivacyPoolOnChainConfig> {
  const rpcUrl = getVoucherRpcUrl(network);
  const client = getSuiClient(true, rpcUrl);
  const resp = await client.getObject({
    id: VOUCHER_CONFIG.CONFIG_ID,
    options: { showContent: true },
  });

  const content = resp?.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    throw new Error('Privacy pool config object missing move object content');
  }

  const fields = (content as SuiMoveObject).fields as Record<string, string | number | undefined>;
  if (!fields) {
    throw new Error('Privacy pool config object is missing content fields');
  }

  const noteDenominationRaw = fields.note_denomination ?? fields.noteDenomination;
  const depositFixedFeeRaw = fields.deposit_fixed_fee ?? fields.depositFixedFee;
  const depositFeeBpsRaw = fields.deposit_fee_bps ?? fields.depositFeeBps;
  const withdrawFixedFeeRaw = fields.withdraw_fixed_fee ?? fields.withdrawFixedFee;
  const withdrawFeeBpsRaw = fields.withdraw_fee_bps ?? fields.withdrawFeeBps;

  if (noteDenominationRaw === undefined) {
    throw new Error('Privacy pool config missing note_denomination');
  }

  return {
    noteDenomination: toBigInt(noteDenominationRaw),
    depositFixedFee: toBigInt(depositFixedFeeRaw ?? 0),
    depositFeeBps: Number(depositFeeBpsRaw ?? 0),
    withdrawFixedFee: toBigInt(withdrawFixedFeeRaw ?? 0),
    withdrawFeeBps: Number(withdrawFeeBpsRaw ?? 0),
  };
}

function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    return BigInt(value);
  }
  return BigInt(value);
}
