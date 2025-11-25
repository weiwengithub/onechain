/**
 * Privacy Pool Constants
 * 基于 Tornado Cash 原理的 Sui 链隐私池配置
 */

import {
  PACKAGE_ID,
  CONFIG_ID,
  MERKLE_TREE_HEIGHT,
  ROOT_HISTORY_SIZE,
  CLOCK_OBJECT_ID,
  ZK_PROOF_CONFIG,
} from './privacyPoolShared';

// Privacy Pool 合约配置
export const PRIVACY_POOL_CONFIG = {
  // 从共享常量引用
  PACKAGE_ID,
  CONFIG_ID,
  MERKLE_TREE_HEIGHT,
  ROOT_HISTORY_SIZE,
  CLOCK_OBJECT_ID,

  // 支持的存款面额 (单位: MIST, 1 SUI = 10^9 MIST)
  DENOMINATIONS: {
    '0.1': 100_000_000,      // 0.1 SUI
    '1': 1_000_000_000,      // 1 SUI
    '10': 10_000_000_000,    // 10 SUI
    '100': 100_000_000_000,  // 100 SUI
  } as const,
} as const;

// 重新导出共享常量，方便从 PRIVACY_POOL_CONFIG 迁移的代码使用
export { CLOCK_OBJECT_ID, CONFIG_ID, MERKLE_TREE_HEIGHT, PACKAGE_ID, ROOT_HISTORY_SIZE, ZK_PROOF_CONFIG };

// 存储键名
export const PRIVACY_POOL_STORAGE_KEYS = {
  DEPOSITS: 'privacy_pool_deposits',
  NOTES: 'privacy_pool_notes',
  MERKLE_TREE: 'privacy_pool_merkle_tree',
  NULLIFIERS: 'privacy_pool_nullifiers',
} as const;

// 事件类型
export const PRIVACY_POOL_EVENTS = {
  DEPOSIT: 'DepositEvent',
  WITHDRAWAL: 'WithdrawalEvent',
} as const;

// 错误码
export const PRIVACY_POOL_ERRORS = {
  E_COMMITMENT_ALREADY_SUBMITTED: 1,
  E_INVALID_AMOUNT: 2,
  E_NULLIFIER_ALREADY_USED: 3,
  E_UNKNOWN_ROOT: 4,
  E_INVALID_PROOF: 5,
  E_FEE_TOO_HIGH: 6,
  E_INSUFFICIENT_BALANCE: 7,
  E_NOTE_NOT_FOUND: 8,
  E_PROOF_GENERATION_FAILED: 9,
  E_MERKLE_TREE_SYNC_FAILED: 10,
} as const;

// Note 格式
export const NOTE_FORMAT = {
  PREFIX: 'sui-privacy-',
  SEPARATOR: '-',
  VERSION: 'v1',
} as const;

// 生成 Note 字符串
export function formatNote(params: {
  network: string;
  amount: string;
  netId: number;
  commitment: string;
  nullifier: string;
  secret: string;
}): string {
  const { network, amount, netId, commitment, nullifier, secret } = params;
  return [
    NOTE_FORMAT.PREFIX,
    NOTE_FORMAT.VERSION,
    network,
    amount,
    netId.toString(),
    commitment,
    nullifier,
    secret,
  ].join(NOTE_FORMAT.SEPARATOR);
}

// 解析 Note 字符串
export function parseNote(note: string): {
  network: string;
  amount: string;
  netId: number;
  commitment: string;
  nullifier: string;
  secret: string;
} | null {
  try {
    const parts = note.split(NOTE_FORMAT.SEPARATOR);

    if (parts.length !== 8) return null;
    if (parts[0] !== NOTE_FORMAT.PREFIX) return null;
    if (parts[1] !== NOTE_FORMAT.VERSION) return null;

    return {
      network: parts[2],
      amount: parts[3],
      netId: parseInt(parts[4], 10),
      commitment: parts[5],
      nullifier: parts[6],
      secret: parts[7],
    };
  } catch {
    return null;
  }
}
