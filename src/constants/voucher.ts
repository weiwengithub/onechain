/**
 * Voucher (支票) Constants
 * OneChain (OCT) 链支票系统配置
 */

import {
  PACKAGE_ID,
  CONFIG_ID,
  MERKLE_TREE_HEIGHT,
  ROOT_HISTORY_SIZE,
  CLOCK_OBJECT_ID,
  ZK_PROOF_CONFIG,
} from './privacyPoolShared';
import { bigIntToLeBuffer, leBuff2BigInt, toHex } from '@/utils/crypto/pedersen';

/**
 * 支票合约配置 (使用 Privacy Pool 合约)
 */
export const VOUCHER_CONFIG = {
  // 从共享常量引用
  PACKAGE_ID,
  CONFIG_ID,
  MERKLE_TREE_HEIGHT,
  ROOT_HISTORY_SIZE,
  CLOCK_OBJECT_ID,

  // OCT 链 RPC 端点
  RPC_ENDPOINTS: {
    mainnet: 'https://rpc-mainnet.onelabs.cc:443',
    testnet: 'https://rpc-testnet.onelabs.cc:443',
  },
} as const;

// 重新导出共享常量，方便从 VOUCHER_CONFIG 迁移的代码使用
export { CLOCK_OBJECT_ID, CONFIG_ID, MERKLE_TREE_HEIGHT, PACKAGE_ID, ROOT_HISTORY_SIZE };

/**
 * 支持的币种配置（集中管理）
 * 修改这里即可控制整个系统支持的币种
 *
 * 注意：当前智能合约只支持 USDH，其他币种暂不支持
 */
export const VOUCHER_SUPPORTED_CURRENCIES = {
  oct: {
    USDH: {
      decimals: 9,
      coinType: '0x3d1ecd3dc3c8ecf8cb17978b6b5fe0b06704d4ed87cc37176a01510c45e21c92::usdh::USDH',
    },
  },
  'oct-testnet': {
    USDH: {
      decimals: 9,
      coinType: '0x72eba41c73c4c2ce2bcfc6ec1dc0896ba1b5c17bfe7ae7c6c779943f84912b41::usdh::USDH',
    },
  },
} as const;

/**
 * 支票支持的币种和面额
 * 根据 OCT 链的资产配置
 */
/**
 * 根据 decimals 生成面额配置
 */
export function generateDenominations(decimals: number) {
  const multiplier = Math.pow(10, decimals);
  return {
    '0.1': Math.floor(0.1 * multiplier),
    '1': Math.floor(1 * multiplier),
    '10': Math.floor(10 * multiplier),
    '100': Math.floor(100 * multiplier),
  };
}

// 基于 VOUCHER_SUPPORTED_CURRENCIES 动态生成面额配置
export const VOUCHER_DENOMINATIONS = {
  oct: {
    USDH: generateDenominations(VOUCHER_SUPPORTED_CURRENCIES.oct.USDH.decimals),
  },
  'oct-testnet': {
    USDH: generateDenominations(VOUCHER_SUPPORTED_CURRENCIES['oct-testnet'].USDH.decimals),
  },
} as const;

/**
 * 支票币种类型定义 (OCT 链资产)
 * 基于 VOUCHER_SUPPORTED_CURRENCIES 动态生成
 */
export const VOUCHER_COIN_TYPES = {
  oct: {
    USDH: VOUCHER_SUPPORTED_CURRENCIES.oct.USDH.coinType,
  },
  'oct-testnet': {
    USDH: VOUCHER_SUPPORTED_CURRENCIES['oct-testnet'].USDH.coinType,
  },
} as const;

// 重新导出零知识证明配置 (从共享常量导入)
export { ZK_PROOF_CONFIG };

/**
 * 支票码格式 (privacy-sui compatible - 新格式)
 * Format: S-{amount}-{leafIndex}-0x{preimage}
 * - amount: 原始单位（如 1000000000 = 1 USDH）
 * - leafIndex: 存款事件的叶子索引（从 DepositEvent 获取）
 * - preimage: 62字节 = nullifier(31字节) + secret(31字节) 的小端序拼接
 *
 * 注意：此格式与 privacy-sui 最新版本（commit 20a931be）一致
 */
export const VOUCHER_CODE_FORMAT = {
  PREFIX: 'S',
  SEPARATOR: '-',
  PREIMAGE_BYTE_LENGTH: 62,  // nullifier(31) + secret(31)
  LEAF_INDEX_REQUIRED: true,  // 新格式要求 leafIndex
} as const;

/**
 * 存储键名
 */
export const VOUCHER_STORAGE_KEYS = {
  VOUCHERS: 'vouchers',
  TRANSACTIONS: 'voucher_transactions',
  MERKLE_TREE: 'voucher_merkle_tree',
} as const;

/**
 * 事件类型
 */
export const VOUCHER_EVENTS = {
  CREATE: 'VoucherCreateEvent',
  REDEEM: 'VoucherRedeemEvent',
} as const;

/**
 * 错误码
 */
export const VOUCHER_ERRORS = {
  E_INVALID_VOUCHER_CODE: 1001,
  E_VOUCHER_ALREADY_REDEEMED: 1002,
  E_INVALID_AMOUNT: 1003,
  E_INSUFFICIENT_BALANCE: 1004,
  E_PROOF_GENERATION_FAILED: 1005,
  E_NETWORK_MISMATCH: 1006,
  E_CURRENCY_NOT_SUPPORTED: 1007,
} as const;

/**
 * 服务费配置
 */
export const VOUCHER_FEE_CONFIG = {
  CREATE_FEE_PERCENT: 0.001,  // 0.1% 开支票手续费
  REDEEM_FEE_PERCENT: 0.001,  // 0.1% 兑换手续费
  MIN_FEE: 1_000_000,         // 最小手续费 0.001 代币
} as const;

/**
 * 生成支票码 (privacy-sui compatible format - 新格式)
 * Format: S-{amount}-{leafIndex}-0x{preimage}
 *
 * @param params.amount - 原始单位金额（如 1000000000 = 1 USDH）
 * @param params.leafIndex - 存款事件的叶子索引（从 DepositEvent 中提取）
 * @param params.nullifier - nullifier (bigint)
 * @param params.secret - secret (bigint)
 * @returns 支票码字符串，例如: "S-1000000000-42-0x{124_hex_chars}"
 *
 * @example
 * formatVoucherCode({
 *   amount: 1000000000,
 *   leafIndex: 42,
 *   nullifier: 0x123...n,
 *   secret: 0x456...n
 * })
 * // 返回: "S-1000000000-42-0xf095e0f2...e8e"
 */
export function formatVoucherCode(params: {
  amount: number;
  leafIndex: number;
  nullifier: bigint;
  secret: bigint;
}): string {
  const { amount, leafIndex, nullifier, secret } = params;

  // 验证 leafIndex
  if (leafIndex < 0 || !Number.isInteger(leafIndex)) {
    throw new Error(`Invalid leafIndex: ${leafIndex}. Must be a non-negative integer.`);
  }

  // 构造 preimage: nullifier (31 bytes) + secret (31 bytes)
  // 使用小端序格式（与 privacy-sui 一致）
  const nullifierBuf = bigIntToLeBuffer(nullifier, 31);
  const secretBuf = bigIntToLeBuffer(secret, 31);
  const preimage = Buffer.concat([nullifierBuf, secretBuf]);

  // 转换为十六进制字符串 (0x + 124 hex chars)
  const preimageHex = toHex(preimage, VOUCHER_CODE_FORMAT.PREIMAGE_BYTE_LENGTH);

  // 新格式: S-{amount}-{leafIndex}-{preimageHex}
  return `${VOUCHER_CODE_FORMAT.PREFIX}${VOUCHER_CODE_FORMAT.SEPARATOR}${amount}${VOUCHER_CODE_FORMAT.SEPARATOR}${leafIndex}${VOUCHER_CODE_FORMAT.SEPARATOR}${preimageHex}`;
}

/**
 * 解析支票码 (privacy-sui compatible format - 新格式)
 * Format: S-{amount}-{leafIndex}-0x{preimage}
 *
 * @param code - 支票码字符串
 * @returns 解析结果 { amount, leafIndex, nullifier, secret } 或 null（格式无效时）
 *
 * @example
 * parseVoucherCode("S-1000000000-42-0xf095e0f2...e8e")
 * // 返回: { amount: 1000000000, leafIndex: 42, nullifier: 0x123...n, secret: 0x456...n }
 */
export function parseVoucherCode(code: string): {
  amount: number;
  leafIndex: number;
  nullifier: bigint;
  secret: bigint;
} | null {
  try {
    // 新正则表达式: S-{数字}-{数字}-0x{124个十六进制字符}
    const noteRegex = /^S-(?<amount>\d+)-(?<leafIndex>\d+)-0x(?<note>[0-9a-fA-F]{124})$/;
    const match = noteRegex.exec(code);

    if (!match || !match.groups) {
      return null;
    }

    // 提取金额
    const amount = Number(match.groups.amount);
    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    // 提取 leafIndex
    const leafIndex = Number(match.groups.leafIndex);
    if (isNaN(leafIndex) || leafIndex < 0) {
      return null;
    }

    // 提取 preimage (124 hex chars = 62 bytes)
    const hexNote = match.groups.note;
    const buffer = Buffer.from(hexNote, 'hex');

    if (buffer.length !== VOUCHER_CODE_FORMAT.PREIMAGE_BYTE_LENGTH) {
      return null;
    }

    // 解析 preimage: 前31字节是 nullifier，后31字节是 secret
    const nullifierBuf = buffer.slice(0, 31);
    const secretBuf = buffer.slice(31, 62);

    // 转换为 BigInt (小端序)
    const nullifier = leBuff2BigInt(nullifierBuf);
    const secret = leBuff2BigInt(secretBuf);

    return {
      amount,
      leafIndex,
      nullifier,
      secret,
    };
  } catch (error) {
    console.error('Failed to parse voucher code:', error);
    return null;
  }
}

/**
 * 验证支票码
 */
export function isValidVoucherCode(code: string): boolean {
  return parseVoucherCode(code) !== null;
}

/**
 * 获取当前网络的 RPC URL
 */
export function getVoucherRpcUrl(network: 'oct' | 'oct-testnet'): string {
  return network === 'oct'
    ? VOUCHER_CONFIG.RPC_ENDPOINTS.mainnet
    : VOUCHER_CONFIG.RPC_ENDPOINTS.testnet;
}

/**
 * 获取支持的币种列表（用于 UI）
 * 从集中配置中动态获取
 */
export function getSupportedCurrencies(network: 'oct' | 'oct-testnet'): string[] {
  return Object.keys(VOUCHER_SUPPORTED_CURRENCIES[network]);
}

/**
 * 获取币种的完整类型
 */
export function getCoinType(network: 'oct' | 'oct-testnet', currency: string): string | undefined {
  return VOUCHER_COIN_TYPES[network][currency as keyof typeof VOUCHER_COIN_TYPES[typeof network]];
}

/**
 * 计算手续费
 */
export function calculateVoucherFee(amount: number, type: 'create' | 'redeem'): number {
  const percent = type === 'create'
    ? VOUCHER_FEE_CONFIG.CREATE_FEE_PERCENT
    : VOUCHER_FEE_CONFIG.REDEEM_FEE_PERCENT;

  const fee = Math.floor(amount * percent);
  return Math.max(fee, VOUCHER_FEE_CONFIG.MIN_FEE);
}
