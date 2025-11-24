import type { Ed25519Keypair as OnelabsEd25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import type { Ed25519Keypair as MystenEd25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { PartialZkLoginSignature } from '@/utils/sui/zkloginService';

/**
 * Voucher (支票) Types
 * 基于 Privacy Pool 的支票系统类型定义
 */

/**
 * 支票信息
 */
export interface Voucher {
  id: string;                    // 唯一标识
  accountAddress: string;        // 归属的账户地址（链上唯一）
  network: string;               // 网络 (oct, oct-testnet)
  currency: string;              // 币种 (USDH, USDT, OCT)
  amount: string;                // 显示金额 (如 "100 USDH")
  denomination: number;          // 实际金额 (MIST 单位)
  commitment: string;            // 承诺值 (hex)
  nullifier: string;             // nullifier (hex)
  secret: string;                // secret (hex)
  nullifierHash: string;         // nullifier hash (hex)
  leafIndex: number;             // Merkle 树叶子索引
  timestamp: number;             // 创建时间戳
  voucherCode: string;           // 支票码 (用于分享)
  redeemed: boolean;             // 是否已兑换
  txDigest?: string;             // 创建交易哈希
  redeemTxDigest?: string;       // 兑换交易哈希
  redeemTime?: number;           // 兑换时间
}

/**
 * 创建支票参数
 */
export interface CreateVoucherParams {
  currency: string;              // 币种
  amount: number;                // 金额 (MIST)
  coinIds: string[];             // 用于支付的 Coin Object IDs
}

/**
 * 兑换支票参数
 */
export interface RedeemVoucherParams {
  voucherCode: string;           // 支票码
  recipient: string;             // 接收地址
  relayer?: string;              // 中继器地址 (可选)
  fee?: number;                  // 中继费用 (可选)
}

/**
 * 支票事件 - 创建
 */
export interface VoucherCreateEvent {
  commitment: string;
  amount: number;
  currency: string;
  leafIndex: number;
  timestamp: number;
}

/**
 * 支票事件 - 兑换
 */
export interface VoucherRedeemEvent {
  nullifierHash: string;
  recipient: string;
  amount: number;
  currency: string;
  timestamp: number;
}

/**
 * 支票交易记录
 */
export interface VoucherTransaction {
  id: string;
  type: 'create' | 'redeem';
  voucherId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed';
  txDigest?: string;
  timestamp: number;
  error?: string;
}

/**
 * 支票统计信息
 */
export interface VoucherStats {
  totalCreated: number;          // 总共创建的支票数
  totalRedeemed: number;         // 总共兑换的支票数
  totalValue: string;            // 总价值
  issued: number;                // 已发行数量
  issuedValue: string;           // 已发行价值
}

/**
 * 支票码格式化参数
 */
export interface VoucherCodeParams {
  network: string;
  currency: string;
  amount: string;
  commitment: string;
  nullifier: string;
  secret: string;
}

/**
 * 解析后的支票码
 */
export interface ParsedVoucherCode {
  network: string;
  currency: string;
  amount: string;
  commitment: string;
  nullifier: string;
  secret: string;
  valid: boolean;
  error?: string;
}

export type VoucherSupportedSigner = OnelabsEd25519Keypair | MystenEd25519Keypair;

export interface VoucherZkLoginContext {
  partialZkLoginSignature: PartialZkLoginSignature;
  addressSeed: string;
  maxEpoch: number;
  userAddress: string;
}

export type VoucherSigningContext =
  | {
    type: 'standard';
    signer: VoucherSupportedSigner;
  }
  | {
    type: 'zklogin';
    signer: VoucherSupportedSigner;
    zkLogin: VoucherZkLoginContext;
  };
