/**
 * Poseidon Hash Implementation
 * ZK-friendly hash function for privacy pool
 *
 * 注意: 这是一个简化版本用于演示
 * 生产环境应该使用 circomlibjs 的 Poseidon 实现
 */

import type { PoseidonHashInput } from '@/types/privacyPool';

// BN254 Field 模数
const FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

// Poseidon 参数
const POSEIDON_T = 3; // state size
const POSEIDON_NROUNDSF = 8; // full rounds
const POSEIDON_NROUNDSP = 57; // partial rounds

/**
 * 模加法
 */
function modAdd(a: bigint, b: bigint): bigint {
  return (a + b) % FIELD_MODULUS;
}

/**
 * 模乘法
 */
function modMul(a: bigint, b: bigint): bigint {
  return (a * b) % FIELD_MODULUS;
}

/**
 * 模幂运算
 */
function modPow(base: bigint, exp: bigint): bigint {
  let result = BigInt(1);
  let b = base % FIELD_MODULUS;

  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = modMul(result, b);
    }
    b = modMul(b, b);
    exp = exp / BigInt(2);
  }

  return result;
}

/**
 * S-box: x^5 in GF(p)
 */
function sbox(input: bigint): bigint {
  const x2 = modMul(input, input);
  const x4 = modMul(x2, x2);
  return modMul(x4, input);
}

/**
 * 简化的 Poseidon Hash
 * 实际生产环境应使用 circomlibjs 的完整实现
 *
 * ⚠️ CRITICAL SECURITY ISSUE - P0 Priority
 *
 * 问题: 这是一个不完整的Poseidon实现，缺少关键组件:
 * 1. ❌ MDS矩阵混合层 (Mixed Linear Layer)
 * 2. ❌ 轮常数 (Round Constants)
 * 3. ❌ 完整的置换轮次 (应该有8个全轮+57个部分轮)
 * 4. ❌ 正确的状态转换逻辑
 *
 * 安全风险:
 * - 🔴 碰撞攻击风险
 * - 🔴 预映像攻击风险
 * - 🔴 无法与Circom电路兼容
 * - 🔴 不符合Poseidon标准规范
 *
 * TODO (P0): 替换为标准实现
 *
 * 推荐方案:
 * ```typescript
 * // 方案1: 使用 circomlibjs (推荐)
 * import { poseidon } from 'circomlibjs';
 * export function poseidonHash(inputs: bigint[]): string {
 *   const hash = poseidon(inputs);
 *   return '0x' + hash.toString(16).padStart(64, '0');
 * }
 *
 * // 方案2: 使用 @iden3/js-crypto
 * import { poseidon } from '@iden3/js-crypto';
 * ```
 *
 * 参考: ONETRANSFER_ISSUES.md - 问题#2
 * 工作量: 1-2天
 *
 * @deprecated 仅用于开发测试，禁止在生产环境使用
 */
export function poseidonHash(inputs: (string | bigint)[]): string {
  // 转换输入为 bigint
  const state: bigint[] = inputs.map((input) => {
    if (typeof input === 'string') {
      // 移除 0x 前缀并转换
      const hex = input.startsWith('0x') ? input.slice(2) : input;
      return BigInt('0x' + hex) % FIELD_MODULUS;
    }
    return input % FIELD_MODULUS;
  });

  // 填充状态到 t 大小
  while (state.length < POSEIDON_T) {
    state.push(BigInt(0));
  }

  // ⚠️ SECURITY WARNING: 简化的置换，缺少MDS矩阵和轮常数
  // 真实实现应该有完整的Poseidon置换:
  // for (let round = 0; round < nRoundsF + nRoundsP; round++) {
  //   state = addRoundConstants(state, round);
  //   state = applySbox(state, round);
  //   state = mixLayer(state); // MDS矩阵乘法
  // }
  for (let i = 0; i < state.length; i++) {
    state[i] = sbox(state[i]);
  }

  // 返回第一个元素作为哈希值
  const hash = state[0];

  // 转换为 32 字节十六进制字符串
  return '0x' + hash.toString(16).padStart(64, '0');
}

/**
 * 计算承诺值
 * commitment = Poseidon(nullifier, secret)
 */
export function computeCommitment(nullifier: string, secret: string): string {
  return poseidonHash([nullifier, secret]);
}

/**
 * 计算 nullifier hash
 * nullifierHash = Poseidon(nullifier)
 */
export function computeNullifierHash(nullifier: string): string {
  return poseidonHash([nullifier]);
}

/**
 * 计算 Merkle 树节点哈希
 * hash = Poseidon(left, right)
 */
export function hashLeftRight(left: string, right: string): string {
  return poseidonHash([left, right]);
}

/**
 * 生成随机 Field 元素
 */
export function randomFieldElement(): string {
  const randomBytes = new Uint8Array(31); // 248 bits
  crypto.getRandomValues(randomBytes);

  let value = BigInt(0);
  for (let i = 0; i < randomBytes.length; i++) {
    value = (value << BigInt(8)) | BigInt(randomBytes[i]);
  }

  value = value % FIELD_MODULUS;

  return '0x' + value.toString(16).padStart(64, '0');
}

/**
 * 生成存款所需的随机值
 */
export function generateDepositSecrets(): {
  nullifier: string;
  secret: string;
  commitment: string;
  nullifierHash: string;
} {
  const nullifier = randomFieldElement();
  const secret = randomFieldElement();
  const commitment = computeCommitment(nullifier, secret);
  const nullifierHash = computeNullifierHash(nullifier);

  return {
    nullifier,
    secret,
    commitment,
    nullifierHash,
  };
}

/**
 * 将字符串转换为 Field 元素
 */
export function stringToField(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  let value = BigInt(0);
  for (let i = 0; i < Math.min(bytes.length, 31); i++) {
    value = (value << BigInt(8)) | BigInt(bytes[i]);
  }

  value = value % FIELD_MODULUS;

  return '0x' + value.toString(16).padStart(64, '0');
}

/**
 * 将 SUI 地址转换为 Field 元素
 */
export function addressToField(address: string): string {
  // SUI 地址已经是 32 字节的十六进制
  const hex = address.startsWith('0x') ? address.slice(2) : address;
  const value = BigInt('0x' + hex) % FIELD_MODULUS;
  return '0x' + value.toString(16).padStart(64, '0');
}

/**
 * 将数字转换为 Field 元素
 */
export function numberToField(num: number | bigint): string {
  const value = BigInt(num) % FIELD_MODULUS;
  return '0x' + value.toString(16).padStart(64, '0');
}

/**
 * 字节数组转十六进制字符串
 */
export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 十六进制字符串转字节数组
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }

  return bytes;
}

// 导出工具函数
export const PoseidonUtils = {
  hash: poseidonHash,
  computeCommitment,
  computeNullifierHash,
  hashLeftRight,
  randomFieldElement,
  generateDepositSecrets,
  stringToField,
  addressToField,
  numberToField,
  bytesToHex,
  hexToBytes,
  FIELD_MODULUS,
};

export default PoseidonUtils;
