/**
 * Voucher Client SDK
 * 基于 Privacy Pool 的 OCT 链支票系统客户端
 */

import { bcs } from '@mysten/sui/bcs';
import { fromB64 } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import { Transaction as TransactionOct } from '@onelabs/sui/transactions';
import { getZkLoginSignature } from '@mysten/sui/zklogin';
import type {
  Voucher,
  CreateVoucherParams,
  RedeemVoucherParams,
  VoucherCreateEvent,
  VoucherRedeemEvent,
  VoucherStats,
  VoucherSigningContext,
} from '@/types/voucher';
import {
  VOUCHER_CONFIG,
  parseVoucherCode,
  getVoucherRpcUrl,
  getCoinType,
} from '@/constants/voucher';
import {
  computeNullifierHash as computePedersenNullifierHash,
  hexToBytes as pedersenHexToBytes,
} from '@/utils/crypto/pedersen';
import { MerkleTree } from '@/utils/crypto/merkleTree';
import { getSuiClient } from '@/onechain/utils';
import oneTransferApi, { type ProofRequest, createOneTransferApi } from '@/onechain/api/oneTransferApi';
import {
  VoucherErrorCode,
  createVoucherError,
  parseVoucherError,
  GAS_PAYMENT_ERROR_KEYWORDS,
} from '@/utils/voucherError';
import { fetchPrivacyPoolConfig, type PrivacyPoolOnChainConfig } from '@/libs/privacyPool/config';
import { type SponsoredExecutionDeps } from '@/libs/voucher/sponsor';
import { createVoucherWithDeposit, type DepositContext } from '@/libs/voucher/deposit';
import { redeemVoucherWithWithdraw, type WithdrawContext } from '@/libs/voucher/withdraw';
import { getOneChainNetworkConfig, type OneChainNetwork } from '@/onechain/networkConfig';

const BOOL_VECTOR = bcs.vector(bcs.bool());

const DEBUG_LOG_ENABLED = false;
const debugLog = (...args: any[]): void => {
  if (!DEBUG_LOG_ENABLED) {
    return;
  }
  console.log(...args);
};
const debugWarn = (...args: any[]): void => {
  if (!DEBUG_LOG_ENABLED) {
    return;
  }
  console.warn(...args);
};

const GAS_ERROR_KEYWORDS = [
  'insufficientgas',
  'insufficient gas',
  'gasbudgettoolow',
  'gas budget too low',
  'gas price too low',
  'gas price is too low',
  'not enough gas',
  'gas balance too low',
  'gasbalancetoolow',
  'balance of gas object',
  'gas exceeded maximum',
  'needed_gas_amount',
];

const GAS_OBJECT_ERROR_KEYWORDS = [
  'invalidgasobject',
  'invalid gas object',
];

const BALANCE_ERROR_KEYWORDS = [
  'insufficient coin balance',
  'insufficient balance',
  'not enough balance',
];

function detectVoucherErrorCodeFromError(error: unknown): VoucherErrorCode | null {
  const message: string = typeof error === 'string'
    ? error
    : (error as Error)?.message ?? '';
  const lower = message.toLowerCase();

  if (message && Object.values(VoucherErrorCode).includes(message as VoucherErrorCode)) {
    return message as VoucherErrorCode;
  }

  if (GAS_PAYMENT_ERROR_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return VoucherErrorCode.GAS_INSUFFICIENT;
  }

  if (GAS_ERROR_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return VoucherErrorCode.GAS_INSUFFICIENT;
  }

  if (GAS_OBJECT_ERROR_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return VoucherErrorCode.GAS_OBJECT_INVALID;
  }

  if (BALANCE_ERROR_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return VoucherErrorCode.COIN_BALANCE_INSUFFICIENT;
  }

  return null;
}

function resolveVoucherErrorCode(
  error: unknown,
  fallback: VoucherErrorCode,
): VoucherErrorCode {
  const detected = detectVoucherErrorCodeFromError(error);
  if (detected) {
    return detected;
  }

  if (error instanceof Error) {
    const parsed = parseVoucherError(error);
    if (parsed && parsed !== VoucherErrorCode.UNKNOWN_ERROR) {
      return parsed;
    }
  }

  return fallback;
}

/**
 * 重试配置接口
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,           // 最多5次尝试
  baseDelay: 2000,          // 基础延迟2秒
  maxDelay: 15000,          // 最大延迟15秒
  backoffMultiplier: 1.5,   // 指数退避系数
};

/**
 * 判断错误是否可重试
 * @param error - 错误对象
 * @returns 是否可重试
 */
function isRetryableError(error: Error): boolean {
  const msg = error.message;

  // 可重试：本地承诺数量与链上数量不匹配（事件索引延迟）
  if (msg.includes('本地承诺数量') && msg.includes('与链上数量')) {
    return true;
  }

  // 可重试：网络错误
  if (msg.includes('network') || msg.includes('Network') ||
    msg.includes('timeout') || msg.includes('Timeout') ||
    msg.includes('无法获取')) {
    return true;
  }

  // 可重试：RPC错误
  if (msg.includes('RPC') || msg.includes('rpc')) {
    return true;
  }

  // 致命错误：Merkle根验证失败（数据损坏，相同数量但root不同）
  if (msg.includes('Merkle根验证失败')) {
    return false;
  }

  // 致命错误：commitment解析错误
  if (msg.includes('Commitment 解析错误') || msg.includes('commitment解析错误')) {
    return false;
  }

  // 致命错误：哈希算法不一致
  if (msg.includes('哈希算法')) {
    return false;
  }

  // 默认：可重试（保守策略）
  return true;
}

/**
 * 使用指数退避策略重试函数
 * @param fn - 要执行的异步函数
 * @param config - 重试配置
 * @returns 函数执行结果
 * @throws {Error} 所有重试都失败后抛出最后一个错误
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // 执行函数
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // 检查是否可重试
      if (!isRetryableError(lastError)) {
        console.error(' 检测到致命错误，停止重试:', lastError.message);
        throw lastError;
      }

      // 最后一次尝试失败
      if (attempt === config.maxAttempts) {
        console.error(` 重试${config.maxAttempts}次后仍然失败`);
        throw lastError;
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay,
      );

      debugWarn(
        ` 尝试 ${attempt}/${config.maxAttempts} 失败: ${lastError.message}\n` +
        ` 等待 ${delay / 1000} 秒后重试...`,
      );

      // 通知回调
      config.onRetry?.(attempt, delay, lastError);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 将十六进制字符串转换为十进制字符串
 * 用于ZK证明输入（证明服务器期望十进制格式，与 privacy-sui 一致）
 *
 * 示例：
 *   "0x123abc" → "1194684"
 *   "0xc0e296531c26929..." → "5452775741701204..."
 *
 * @param hex - 十六进制字符串（带或不带0x前缀）
 * @returns 十进制字符串（无0x前缀）
 */
function hexToDecimalString(hex: string): string {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + cleanHex).toString();  // toString() 默认返回十进制
}

export class VoucherClient {
  private client: any; // SuiClient 或 SuiClientOct
  private packageId: string;
  private configId: string;
  private network: 'oct' | 'oct-testnet';
  private isOct: boolean;
  private merkleTree: MerkleTree;
  private lastSyncTime = 0;
  private poolConfigCache: PrivacyPoolOnChainConfig | null = null;
  private poolConfigFetchedAt = 0;
  private networkConfig: ReturnType<typeof getOneChainNetworkConfig>;
  private gasPoolEnabled: boolean;
  private gasBudgetValue: number;
  private reserveDurationSecs: number;
  private static readonly POOL_CONFIG_CACHE_TTL = 30_000;

  constructor(network: 'oct' | 'oct-testnet' = 'oct') {
    this.network = network;
    this.isOct = network.startsWith('oct');
    const rpcUrl = getVoucherRpcUrl(network);
    this.client = getSuiClient(this.isOct, rpcUrl);
    this.packageId = VOUCHER_CONFIG.PACKAGE_ID;
    this.configId = VOUCHER_CONFIG.CONFIG_ID;
    this.merkleTree = new MerkleTree(VOUCHER_CONFIG.MERKLE_TREE_HEIGHT);
    const normalizedNetwork = (network === 'oct-testnet' ? 'oct-testnet' : 'oct') as OneChainNetwork;
    this.networkConfig = getOneChainNetworkConfig(normalizedNetwork);
    this.gasPoolEnabled = (this.networkConfig.useGasPool ?? 0) === 1;
    const MIN_SPONSORED_GAS = 5_000_000_000; // 5 OCT baseline
    this.gasBudgetValue = Math.max(this.networkConfig.gasBudget ?? 0, MIN_SPONSORED_GAS);
    this.reserveDurationSecs = this.networkConfig.reserveDurationSecs ?? 60;
  }

  private getSponsoredExecutionDeps(): SponsoredExecutionDeps {
    return {
      gasBudgetValue: this.gasBudgetValue,
      reserveDurationSecs: this.reserveDurationSecs,
      getSenderAddress: this.getSenderAddress.bind(this),
      signTransactionBytes: this.signTransactionBytes.bind(this),
      normalizeExecutionResult: this.normalizeExecutionResult.bind(this),
    };
  }

  private getDepositContext(): DepositContext {
    return {
      network: this.network,
      isOct: this.isOct,
      packageId: this.packageId,
      configId: this.configId,
      gasPoolEnabled: this.gasPoolEnabled,
      gasBudgetValue: this.gasBudgetValue,
      client: this.client,
      loadPoolConfig: this.loadPoolConfig.bind(this),
      getSenderAddress: this.getSenderAddress.bind(this),
      resolveEventsWithFallback: this.resolveEventsWithFallback.bind(this),
      executeWithUserGas: this.executeWithUserGas.bind(this),
      normalizeExecutionResult: this.normalizeExecutionResult.bind(this),
      getSponsoredExecutionDeps: this.getSponsoredExecutionDeps.bind(this),
      detectVoucherErrorCodeFromError,
      resolveVoucherErrorCode,
      debugLog,
      debugWarn,
    };
  }

  private getWithdrawContext(): WithdrawContext {
    return {
      network: this.network,
      isOct: this.isOct,
      packageId: this.packageId,
      configId: this.configId,
      gasPoolEnabled: this.gasPoolEnabled,
      gasBudgetValue: this.gasBudgetValue,
      client: this.client,
      merkleTree: this.merkleTree,
      loadPoolConfig: this.loadPoolConfig.bind(this),
      getSenderAddress: this.getSenderAddress.bind(this),
      generateWithdrawalProof: this.generateWithdrawalProof.bind(this),
      executeWithUserGas: this.executeWithUserGas.bind(this),
      normalizeExecutionResult: this.normalizeExecutionResult.bind(this),
      getSponsoredExecutionDeps: this.getSponsoredExecutionDeps.bind(this),
      detectVoucherErrorCodeFromError,
      resolveVoucherErrorCode,
      debugLog,
      debugWarn,
    };
  }

  /**
   * 获取 signer 的地址
   * Phase 3: 用于 dry-run gas 估算
   * 支持多种 signer 类型
   */
  private async getSenderAddress(signer: any): Promise<string> {
    // 方式 1: getAddress 方法（标准）
    if (typeof signer.getAddress === 'function') {
      return await signer.getAddress();
    }

    // 方式 2: address 属性（OCT）
    if (signer.address) {
      return signer.address;
    }

    // 方式 3: 从 public key 推导
    if (signer.getPublicKey) {
      const publicKey = await signer.getPublicKey();
      if (publicKey.toSuiAddress) {
        return publicKey.toSuiAddress();
      }
    }

    throw new Error('Unable to determine sender address from signer');
  }

  private async signTransactionBytes(
    tx: Transaction | TransactionOct,
    signingContext: VoucherSigningContext,
  ): Promise<{ bytes: Uint8Array | string; signature: string; }> {
    if (signingContext.type === 'zklogin') {
      const { bytes, signature: userSignature } = await tx.sign({
        client: this.client,
        signer: signingContext.signer as any,
      });

      const zkLoginSignature = getZkLoginSignature({
        inputs: {
          ...signingContext.zkLogin.partialZkLoginSignature,
          addressSeed: signingContext.zkLogin.addressSeed,
        },
        maxEpoch: signingContext.zkLogin.maxEpoch,
        userSignature,
      });

      return { bytes, signature: zkLoginSignature };
    }

    return tx.sign({
      client: this.client,
      signer: signingContext.signer as any,
    });
  }

  private normalizeExecutionResult(result: unknown): Record<string, unknown> {
    if (!result || typeof result !== 'object') {
      throw new Error('Empty transaction result');
    }

    let resolved: Record<string, unknown> = result as Record<string, unknown>;
    if (resolved.data && typeof resolved.data === 'object') {
      resolved = resolved.data as Record<string, unknown>;
    }
    if (resolved.result && typeof resolved.result === 'object') {
      resolved = resolved.result as Record<string, unknown>;
    }

    const effects = resolved.effects as Record<string, unknown> | undefined;
    const statusField = effects?.status as unknown;
    const isFailureStatus =
      (typeof statusField === 'object' && statusField !== null && (statusField as {
        status?: string
      }).status === 'failure') ||
      statusField === 'failure';

    if (isFailureStatus) {
      const statusObj = statusField as { error?: unknown };
      const statusError = typeof statusObj?.error === 'string' && statusObj.error.trim().length > 0
        ? statusObj.error
        : 'Transaction execution failed';
      throw new Error(statusError);
    }

    const digest =
      (resolved.digest as string | undefined) ||
      (resolved.transactionDigest as string | undefined) ||
      (effects?.transactionDigest as string | undefined) ||
      (effects?.transactionEffectsDigest as string | undefined);

    if (digest && !resolved.digest) {
      resolved = { ...resolved, digest };
    }

    return resolved;
  }

  private extractEventsFromExecution(result: any): any[] {
    if (Array.isArray(result?.events)) {
      return result.events;
    }
    if (Array.isArray(result?.effects?.events)) {
      return result.effects.events;
    }
    return [];
  }

  private async resolveEventsWithFallback(executionResult: Record<string, unknown>): Promise<any[]> {
    const events = this.extractEventsFromExecution(executionResult);
    if (events.length > 0) {
      return events;
    }
    const digest: string | undefined = executionResult?.digest as string | undefined;
    if (!digest) {
      return [];
    }
    try {
      const txDetails = await this.client.waitForTransactionBlock({
        digest,
        options: { showEvents: true },
      });
      return Array.isArray(txDetails?.events) ? txDetails.events : [];
    } catch (error) {
      console.warn('Failed to fetch transaction events for digest', digest, error);
      return [];
    }
  }

  private async executeWithUserGas(
    tx: Transaction | TransactionOct,
    signingContext: VoucherSigningContext,
    options?: Record<string, unknown>,
  ): Promise<any> {
    if (signingContext.type === 'zklogin') {
      const { bytes, signature } = await this.signTransactionBytes(tx, signingContext);
      return await this.client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options,
      });
    }

    return await this.client.signAndExecuteTransaction({
      signer: signingContext.signer as any,
      transaction: tx,
      options,
    });
  }

  /**
   * 创建支票 (开支票)
   */
  async createVoucher(
    params: CreateVoucherParams,
    signingContext: VoucherSigningContext,
  ): Promise<{ voucher: Voucher; digest: string }> {
    return await createVoucherWithDeposit(params, signingContext, this.getDepositContext());
  }

  private async loadPoolConfig(): Promise<PrivacyPoolOnChainConfig> {
    const now = Date.now();
    if (
      this.poolConfigCache &&
      now - this.poolConfigFetchedAt < VoucherClient.POOL_CONFIG_CACHE_TTL
    ) {
      return this.poolConfigCache;
    }
    const config = await fetchPrivacyPoolConfig(this.network);
    this.poolConfigCache = config;
    this.poolConfigFetchedAt = now;
    return config;
  }

  /**
   * 兑换支票
   */
  async redeemVoucher(
    params: RedeemVoucherParams,
    signingContext: VoucherSigningContext,
  ): Promise<{ digest: string; amount: number }> {
    return await redeemVoucherWithWithdraw(params, signingContext, this.getWithdrawContext());
  }

  async checkVouchersSpentStatus(
    vouchers: Voucher[],
    signer: any,
  ): Promise<boolean[]> {
    if (vouchers.length === 0) {
      return [];
    }

    const senderAddress = await this.getSenderAddress(signer);
    const currency = 'USDH';
    const coinType = getCoinType(this.network, currency);
    if (!coinType) {
      throw new Error(`Unsupported currency: ${currency} on network: ${this.network}`);
    }

    const tx = this.isOct ? new TransactionOct() : new Transaction();
    tx.setSender(senderAddress);
    tx.setGasBudget(1_000_000_000);

    const nullifierHashVectors = vouchers.map((voucher) => {
      const bytes = this.buildNullifierHashBytes(voucher);
      if (!bytes) {
        throw new Error('Voucher缺少 nullifier 数据，无法同步状态');
      }
      return bytes;
    });

    tx.moveCall({
      target: `${this.packageId}::privacy_pool::is_spent_array`,
      typeArguments: [coinType],
      arguments: [
        tx.object(this.configId),
        // @ts-ignore
        tx.pure('vector<vector<u8>>', nullifierHashVectors),
      ],
    });

    const inspectResult = await this.client.devInspectTransactionBlock({
      sender: senderAddress,
      transactionBlock: tx,
    });

    const returnValue = inspectResult?.results?.[0]?.returnValues?.[0];
    if (!returnValue) {
      throw new Error('is_spent_array devInspect returned no values');
    }

    return this.decodeBoolVector(returnValue as [unknown, string]);
  }

  private decodeBoolVector(returnValue: [unknown, string]): boolean[] {
    const [data, typeTag] = returnValue;
    const bytes = this.normalizeReturnBytes(data);

    try {
      return BOOL_VECTOR.parse(bytes);
    } catch {
      if (typeTag === 'vector<vector<u8>>') {
        const nestedVector = bcs.vector(bcs.vector(bcs.u8())).parse(bytes) as number[][];
        return nestedVector.map((vec) => {
          const value = vec[0] ?? 0;
          return value !== 0;
        });
      }
      throw new Error(`Unexpected return type: ${typeTag}`);
    }
  }

  private normalizeReturnBytes(data: unknown): Uint8Array {
    if (typeof data === 'string') {
      return fromB64(data);
    }
    if (Array.isArray(data)) {
      return Uint8Array.from(data as number[]);
    }
    if (
      data &&
      typeof data === 'object' &&
      'bytes' in data &&
      Array.isArray((data as { bytes: number[] }).bytes)
    ) {
      return Uint8Array.from((data as { bytes: number[] }).bytes);
    }
    throw new Error('Unexpected devInspect returnValues format');
  }

  private buildNullifierHashBytes(voucher: Voucher): Uint8Array | null {
    try {
      const nullifierBigInt = this.parseVoucherBigInt(voucher.nullifier);
      const hashHex = computePedersenNullifierHash(nullifierBigInt);
      return pedersenHexToBytes(hashHex);
    } catch (error) {
      console.error('Failed to build nullifier hash bytes:', error);
      return null;
    }
  }

  private parseVoucherBigInt(value: string | undefined): bigint {
    if (!value) {
      throw new Error('Missing voucher field');
    }
    const normalized = value.startsWith('0x') ? value : `0x${value}`;
    return BigInt(normalized);
  }

  /**
   * 生成提款证明
   *
   *  已集成后端ZK证明生成服务
   *
   * 使用后端API生成真实的Groth16证明，确保链上验证能够通过。
   *
   * 证明生成流程：
   * 1. 生成Merkle proof (20层sibling hashes)
   * 2. 构造公开输入和私有输入
   * 3. 调用后端API生成Groth16证明 (10-30秒)
   * 4. 解析并返回证明数据
   *
   * @param voucher - 支票凭证
   * @param recipient - 接收地址
   * @param relayer - 中继地址
   * @param fee - 中继费用
   * @returns 证明和公开输入
   * @throws {Error} Merkle证明生成失败、证明生成失败、网络错误等
   */
  private async generateWithdrawalProof(
    voucher: Voucher,
    recipient: string,
    relayer: string,
    fee: number,
  ): Promise<{
    proof: Uint8Array;
    publicInputs: any;
    merkleProof: any;
    proofLength: number;
    isStandardLength: boolean
  }> {
    //  使用重试机制同步和验证 Merkle Tree
    const onChainRoot: string = await retryWithBackoff(async (): Promise<string> => {
      // Step 1:  按照 privacy-sui 做法强制同步 Merkle Tree（基于链上事件）
      debugLog(' 步骤1/6：强制从链上事件重建 Merkle Tree（safe-withdraw 模式）...');
      await this.syncMerkleTree(true);

      // Step 2: 🔑 从链上获取当前有效的 Merkle Root
      debugLog(' 步骤2/6：查询链上 Merkle Root...');
      const configObject = await this.client.getObject({
        id: this.configId,
        options: { showContent: true },
      });

      if (!configObject.data?.content) {
        throw new Error('无法获取链上隐私池配置对象');
      }

      // 提取链上 Merkle 树状态
      const content = configObject.data.content as any;
      const treeFields = content.fields.marklet_tree_with_history.fields;
      const onChainNextIndex = parseInt(treeFields.next_index);
      const currentRootIndex = parseInt(treeFields.current_root_index);
      const rootValue: string = treeFields.roots[currentRootIndex];

      debugLog(` 链上状态: ${onChainNextIndex} 个承诺, 当前根索引: ${currentRootIndex}`);
      debugLog(` 链上根: ${rootValue}`);

      //  调试：打印链上所有roots
      debugLog('\n === 链上Roots数组调试 ===');
      debugLog(` Roots数组长度: ${treeFields.roots.length}`);
      debugLog(` 当前使用的root索引: ${currentRootIndex}`);
      debugLog(` 最近5个roots:`);
      const startIdx = Math.max(0, currentRootIndex - 2);
      const endIdx = Math.min(treeFields.roots.length, currentRootIndex + 3);
      for (let i = startIdx; i < endIdx; i++) {
        const marker = i === currentRootIndex ? ' ← 当前' : '';
        debugLog(`   [${i}]: ${treeFields.roots[i]}${marker}`);
      }
      debugLog(' ===========================\n');

      // Step 3: 严格验证本地树与链上状态的一致性
      debugLog(' 步骤3/6：验证 Merkle Tree 完整性...');
      const localRoot = this.merkleTree.getRoot();
      const localLeafCount = this.merkleTree.getLeafCount();

      // 3.1 验证承诺数量必须一致
      if (localLeafCount !== onChainNextIndex) {
        throw new Error(
          ` Merkle树同步失败：本地承诺数量 (${localLeafCount}) 与链上数量 (${onChainNextIndex}) 不匹配。\n\n` +
          `系统已按照 privacy-sui 流程强制重建，但仍存在数据缺失。\n` +
          `请稍后再试或联系技术支持。`,
        );
      }

      debugLog(` 承诺数量验证通过：${localLeafCount} 个`);

      // 3.2 验证 Merkle 根必须一致
      if (localRoot !== rootValue) {
        throw new Error(
          ` Merkle根验证失败：本地根与链上根不匹配。\n\n` +
          `本地根: ${localRoot}\n` +
          `链上根: ${rootValue}\n\n` +
          `可能原因：\n` +
          `  1. Commitment 解析错误\n` +
          `  2. 哈希算法与链上不一致\n` +
          `  3. 事件数据损坏或顺序错误\n\n` +
          ` 这是致命错误，将停止重试。\n` +
          `建议：请联系技术支持检查链上数据。`,
        );
      }

      debugLog(' Merkle根验证通过');
      debugLog(' 本地树与链上状态完全一致');

      return rootValue;
    });

    // Step 4: 生成 Merkle Proof（基于强制同步后的最新数据）
    debugLog(' 步骤4/6：生成 Merkle Proof（基于最新同步的数据）...');

    //  关键修复：验证 commitment 在树中的实际位置
    // 参考 privacy-sui/src/helpers/actions/withdraw.js:118-143
    // 原因：树可能在支票创建后增长，commitment 的实际位置可能与 voucher.leafIndex 不同
    const targetCommitment = voucher.commitment;
    let actualLeafIndex = voucher.leafIndex;
    const leaves = this.merkleTree.getLeaves();

    debugLog(` 验证 commitment 位置: voucher声称的索引=${voucher.leafIndex}, 树中叶子总数=${leaves.length}`);

    // 验证 commitment 是否在声称的位置
    if (actualLeafIndex < 0 ||
      actualLeafIndex >= leaves.length ||
      leaves[actualLeafIndex] !== targetCommitment) {

      debugLog(` Commitment 不在预期位置 ${voucher.leafIndex}，开始搜索实际位置...`);

      // 使用 MerkleTree 的内置方法搜索实际位置
      actualLeafIndex = this.merkleTree.getLeafIndex(targetCommitment);

      if (actualLeafIndex === -1) {
        throw new Error(
          ` 支票无效：Commitment ${targetCommitment} 未在 Merkle 树中找到。\n\n` +
          `可能原因：\n` +
          `  1. 该支票从未被创建或未上链\n` +
          `  2. 该支票已被兑换（commitment已使用）\n` +
          `  3. Merkle树同步不完整\n\n` +
          `支票声称的索引: ${voucher.leafIndex}\n` +
          `当前树中叶子数: ${leaves.length}`,
        );
      }

      debugLog(` 找到 commitment 实际位置: ${actualLeafIndex} (声称位置: ${voucher.leafIndex})`);
      debugLog(` 位置偏移: ${actualLeafIndex - voucher.leafIndex} 个位置`);
    } else {
      debugLog(` Commitment 位置验证通过: 索引 ${actualLeafIndex}`);
    }

    // 使用实际找到的索引生成证明
    const merkleProof = this.merkleTree.generateProof(actualLeafIndex);

    // Step 5: 验证 Merkle Proof 正确性
    const proofValid = this.merkleTree.verifyProof(merkleProof);
    if (!proofValid) {
      const computedRoot = this.merkleTree.computeRootFromProof(merkleProof);
      console.error(' Merkle proof local verification failed', {
        leaf: merkleProof.leaf,
        leafIndex: merkleProof.leafIndex,
        pathIndices: merkleProof.pathIndices,
        pathElements: merkleProof.pathElements,
        expectedRoot: this.merkleTree.getRoot(),
        computedRoot,
      });
      throw new Error('Merkle证明生成失败：本地验证未通过');
    }

    debugLog(' Merkle Proof 生成并验证成功');
    debugLog(` Path 长度: ${merkleProof.pathElements.length} 层`);

    // Step 6: 构造公开输入（使用链上根 + 本地计算的 path）
    debugLog(' 步骤5/6：准备证明请求参数...');
    const publicInputs = {
      root: onChainRoot,  //  使用链上根（遵循 safe-withdraw）
      nullifierHash: hexToDecimalString(voucher.nullifierHash),  // 转换为十进制 
      recipient: hexToDecimalString(recipient),            // 转换为十进制 
      relayer: hexToDecimalString(relayer),                // 转换为十进制 
      fee: fee,                                            // 数字 
      refund: voucher.denomination,                      // 使用支票金额 
    };

    // Step 7: 准备后端API请求参数（使用链上根）
    //  关键修复：所有字段必须与 privacy-sui 格式完全一致（十进制字符串）
    // 按照参考请求顺序排列：refund, nullifier, root, nullifier_hash, secret, path_indices, recipient, path_elements
    const proofRequest: ProofRequest = {
      // 重要：后端服务器期望 refund 为 u64 整数类型，而不是字符串！
      refund: voucher.denomination,  // 保持为数字类型 (u64)
      nullifier: hexToDecimalString(voucher.nullifier),         //  修复：十六进制 → 十进制
      root: onChainRoot,  //  使用链上根
      nullifier_hash: hexToDecimalString(voucher.nullifierHash), //  修复：十六进制 → 十进制
      secret: hexToDecimalString(voucher.secret),               //  修复：十六进制 → 十进制
      path_indices: merkleProof.pathIndices,                    //  数字数组（无需修改）
      recipient: hexToDecimalString(recipient),                 //  修复：十六进制 → 十进制
      // 关键修复：path_elements 需要对 BN254 字段取模，确保在有效范围内
      path_elements: merkleProof.pathElements.map(el => (BigInt(el) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')).toString()),
    };

    try {
      // Step 8: 调用后端API生成真实的Groth16证明
      debugLog(' 步骤6/6：调用后端生成零知识证明（预计需要10-30秒）...');
      debugLog(' 证明请求参数:', JSON.stringify(proofRequest, null, 2));
      debugLog(' 请求URL:', '/proof/generate');
      const startTime = Date.now();

      const isTestnet = this.network === 'oct-testnet';
      const api = createOneTransferApi(isTestnet);
      const response = await api.getWithdrawProof(proofRequest);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      debugLog(` 证明生成成功 (耗时: ${elapsedTime}秒)`);
      debugLog(' 后端完整响应:', JSON.stringify(response, null, 2));

      // Step 6: 解析后端返回的证明数据
      const proofBytes = this.parseProofString(response.proof);

      // 验证证明长度 (Groth16 BN254: 128字节压缩格式或256字节未压缩格式)
      debugLog(' 证明长度检查:', {
        actual: proofBytes.length,
        actualHexLength: response.proof?.length || 0,
        format: proofBytes.length === 128 ? '压缩格式' : proofBytes.length === 256 ? '未压缩格式' : '未知格式',
        proofFirstBytes: Array.from(proofBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(''),
        proofLastBytes: Array.from(proofBytes.slice(-16)).map(b => b.toString(16).padStart(2, '0')).join(''),
      });

      // 验证证明长度是否符合标准
      if (proofBytes.length === 128) {
        debugLog(' 证明长度: 128 字节（Groth16 BN254 压缩格式）');
      } else if (proofBytes.length === 256) {
        debugLog(' 证明长度: 256 字节（Groth16 BN254 未压缩格式）');
      } else {
        debugWarn(` 证明长度异常: ${proofBytes.length} 字节（期望 128 或 256 字节）`);
        debugWarn(' 原始证明字符串:', response.proof);

        // 如果长度差异很大，可能是格式问题
        if (proofBytes.length < 100) {
          console.error(' 证明长度过短，可能格式不正确');
          throw new Error(`证明长度过短: ${proofBytes.length} 字节`);
        }
      }

      // 解析公开输入 (如果后端返回了)
      const parsedPublicInputs = publicInputs;
      if (response.public_inputs) {
        try {
          // 后端返回的是十六进制字符串，直接使用
          debugLog(' 使用后端返回的public_inputs:', response.public_inputs);
          // 可以在这里添加对后端返回的public_inputs的处理逻辑
          // 目前保持使用本地计算的publicInputs
        } catch (e) {
          debugWarn('后端返回的public_inputs处理失败，使用本地计算的值', e);
        }
      }

      // 返回证明数据
      const result = {
        proof: proofBytes,
        publicInputs: parsedPublicInputs,
        merkleProof,
        proofLength: proofBytes.length,
        isStandardLength: proofBytes.length === 128 || proofBytes.length === 256, // 支持压缩和未压缩格式
      };

      // 验证证明长度
      if (proofBytes.length === 128) {
        debugLog(' 证明长度: 128 字节（Groth16 BN254 压缩格式）');
      } else if (proofBytes.length === 256) {
        debugLog(' 证明长度: 256 字节（Groth16 BN254 未压缩格式）');
      } else {
        debugWarn(` 证明长度异常: ${proofBytes.length} 字节（期望 128 或 256 字节）`);
        if (proofBytes.length < 100) {
          throw new Error(`证明长度过短: ${proofBytes.length} 字节，无法使用`);
        }
      }

      return result;
    } catch (error: any) {
      // Step 7: 错误处理
      console.error(' 零知识证明生成失败:', error);

      // 提供友好的错误提示
      if (error.message?.includes('timeout') || error.message?.includes('ECONNABORTED')) {
        throw new Error('证明生成超时：服务器响应时间过长，请重试');
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        throw new Error('网络错误：无法连接到证明生成服务，请检查网络连接');
      } else if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        throw new Error('服务器错误：证明生成服务暂时不可用，请稍后重试');
      } else {
        throw new Error(`证明生成失败: ${error.message || '未知错误'}`);
      }
    }
  }

  /**
   * 解析证明字符串为字节数组
   *
   * 后端返回的proof是十六进制字符串 (带或不带0x前缀)
   * 需要转换为Uint8Array供链上验证使用
   *
   * @param proofStr - 十六进制证明字符串
   * @returns 证明字节数组
   */
  private parseProofString(proofStr: string): Uint8Array {
    // 移除0x前缀(如果存在)
    const hex = proofStr.startsWith('0x') ? proofStr.slice(2) : proofStr;

    // 验证是否是有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error('无效的证明格式：不是有效的十六进制字符串');
    }

    // 处理奇数长度 - 添加前导零
    let processedHex = hex;
    if (processedHex.length % 2 !== 0) {
      debugWarn(' 证明长度为奇数，添加前导零');
      processedHex = '0' + processedHex;
    }

    // 转换为字节数组
    return pedersenHexToBytes('0x' + processedHex);
  }

  /**
   * 同步 Merkle Tree
   *
   * @param force - 是否强制同步（忽略缓存）。类似 privacy-sui 的 rebuild-commitments
   *
   * 参考 privacy-sui 的 safe-withdraw 流程：
   * 1. 每次 withdraw 前都强制重建 Merkle Tree（rebuild-commitments）
   * 2. 确保 Merkle Path 基于最新的链上数据
   * 3. 避免缓存导致的数据过时问题
   */
  async syncMerkleTree(force = false): Promise<void> {
    const now = Date.now();

    // 如果不是强制同步，检查缓存
    if (!force && now - this.lastSyncTime < 5000) {
      debugLog('⚡ Merkle树同步时间间隔太短，使用缓存');
      return;
    }

    if (force) {
      debugLog(' 执行完全重建（类似 safe-withdraw 的 rebuild-commitments）...');
    } else {
      debugLog(' 同步 Merkle Tree...');
    }

    try {
      // 查询事件：强制模式使用分页查询获取所有事件
      const events = force
        ? await this.queryAllCreateEvents()     //  分页查询，获取所有事件
        : await this.queryCreateEvents();       // 普通查询，limit=1000

      debugLog(` 获取到 ${events.length} 个创建事件`);

      // 清空并重建树
      this.merkleTree.clear();

      // 按 leafIndex 排序
      events.sort((a, b) => a.leafIndex - b.leafIndex);
      debugLog(' 事件排序完成');

      //  调试：打印前3个commitment
      if (events.length > 0) {
        debugLog('\n === Commitment调试信息 ===');
        for (let i = 0; i < Math.min(3, events.length); i++) {
          const event = events[i];
          debugLog(` Commitment[${i}]:`, {
            hex: event.commitment,
            decimal: BigInt(event.commitment).toString(10),
            leafIndex: event.leafIndex,
          });
        }
        debugLog(' ===========================\n');
      }

      // 插入所有承诺
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.leafIndex !== i) {
          throw new Error(
            `Commitment 序列异常: 期望 leafIndex = ${i}, 实际 = ${event.leafIndex}. ` +
            `请确认事件分页是否完整。`,
          );
        }
        this.merkleTree.insert(event.commitment);

        // 每10个叶子打印一次进度（只在强制模式或少量数据时）
        if (force || events.length <= 50) {
          if ((i + 1) % 10 === 0 || i === 0) {
            debugLog(` 进度: ${i + 1}/${events.length}`);
          }
        }
      }

      debugLog(` Merkle Tree 重建完成：${events.length} 个叶子节点`);
      debugLog(` 当前本地根: ${this.merkleTree.getRoot()}`);

      this.lastSyncTime = now;
    } catch (error) {
      console.error(' Merkle树同步失败:', error);
      throw error;
    }
  }

  /**
   * 从后端索引器获取 Commitments
   *
   * 根据 privacy-sui 最新版本（commit 20a931be）实现
   * 用于从后端索引器获取指定 leafIndex 及之前的所有 commitments
   *
   * @param leafIndex - 目标叶子索引
   * @param expectedCommitment - 期望的 commitment 值（用于验证）
   * @returns 排序后的 leaves 数组
   */
  private async fetchCommitmentsFromIndexer(
    leafIndex: number,
    expectedCommitment: string,
  ): Promise<string[]> {
    try {
      const normalizeToDecimal = (value: string): string => {
        try {
          if (value.startsWith('0x')) {
            return BigInt(value).toString();
          }
          return BigInt(value).toString();
        } catch {
          return value;
        }
      };

      const expectedCommitmentDecimal = normalizeToDecimal(expectedCommitment);

      debugLog(' 步骤1：从后端索引器获取 commitments...');
      debugLog(`   目标 leafIndex: ${leafIndex}`);
      debugLog(
        `   期望 commitment: ${expectedCommitmentDecimal}` +
        (expectedCommitment.startsWith('0x')
          ? ` (hex: ${expectedCommitment})`
          : ''),
      );

      const isTestnet = this.network === 'oct-testnet';
      const api = createOneTransferApi(isTestnet);

      const response = await api.fetchCommitmentList({
        leaf_index: leafIndex,
        package_addr: this.packageId,
      });

      if (!response?.data?.commitments) {
        throw new Error('索引器返回无效的 commitments 数据');
      }

      const items = response.data.commitments;
      debugLog(
        ` 索引器返回 ${items.length} 个 commitments ` +
        `(树高度: ${response.data.height}, 最后索引: ${response.data.last_leaf_index})`,
      );

      // 构建 leaves 数组（稀疏数组，按 leaf_index 排序）
      const leaves: string[] = [];

      items
        .sort((a, b) => Number(a.leaf_index) - Number(b.leaf_index))
        .forEach((item) => {
          const index = Number(item.leaf_index);
          leaves[index] = item.commitment.toString();
        });

      debugLog(` 构建的 leaves 数组长度: ${leaves.length}`);

      // 检查索引器返回的 commitment 与期望值的差异
      const indexerValue = leaves[leafIndex];
      if (indexerValue && normalizeToDecimal(indexerValue) !== expectedCommitmentDecimal) {
        debugWarn(
          ` 索引器返回的 commitment 与期望值不一致。\n` +
          `   索引器: ${indexerValue}\n` +
          `   期望值: ${expectedCommitmentDecimal}`,
        );
        // 保留索引器返回的值，不覆盖
      }

      debugLog(' Commitments 从索引器获取成功');
      return leaves;
    } catch (error: any) {
      console.error(' 从索引器获取 commitments 失败:', error.message);
      throw new Error(`索引器获取失败: ${error.message}`);
    }
  }

  /**
   * 查找 commitment 在 Merkle Tree 中的索引
   */
  private async findLeafIndex(commitment: string): Promise<number> {
    const events = await this.queryCreateEvents();
    const event = events.find((e) => e.commitment === commitment);
    return event ? event.leafIndex : -1;
  }

  /**
   * 查询创建支票事件
   */
  private parseCommitment(rawCommitment: unknown): string {
    if (Array.isArray(rawCommitment)) {
      let commitmentBigInt = 0n;
      for (let i = 0; i < rawCommitment.length; i++) {
        const value = rawCommitment[i];
        if (typeof value !== 'number') {
          throw new Error(`Commitment 解析错误: 非数字字节 ${String(value)}`);
        }
        commitmentBigInt += BigInt(value) << (BigInt(i) * 8n);
      }
      return '0x' + commitmentBigInt.toString(16).padStart(64, '0');
    }

    if (typeof rawCommitment === 'string' && rawCommitment.length) {
      return rawCommitment.startsWith('0x') ? rawCommitment : `0x${rawCommitment}`;
    }

    throw new Error(`Commitment 解析错误: 不支持的格式 ${String(rawCommitment)}`);
  }

  async queryCreateEvents(limit = 1000): Promise<VoucherCreateEvent[]> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::privacy_pool::DepositEvent`,
        },
        limit,
        order: 'ascending',
      });

      return events.data.map((event: any) => {
        const commitment = this.parseCommitment(event.parsedJson?.commitment);
        return {
          commitment,
          amount: Number(event.parsedJson?.amount),
          currency: 'USDH',
          leafIndex: Number(event.parsedJson?.leaf_index),
          timestamp: Number(event.parsedJson?.timestamp),
        };
      });
    } catch (error) {
      console.error('Failed to query create events:', error);
      throw error;
    }
  }

  /**
   * 查询所有创建支票事件（支持分页）
   *
   * 类似 privacy-sui 的 rebuild-commitments，确保获取所有链上事件。
   * 使用分页机制避免 limit 限制导致的数据不完整问题。
   *
   * @returns 所有创建事件的完整列表
   */
  private async queryAllCreateEvents(): Promise<VoucherCreateEvent[]> {
    let allEvents: VoucherCreateEvent[] = [];
    let cursor: any = null;  // EventId type from @mysten/sui
    const limit = 1000;
    let pageCount = 0;

    debugLog(' 开始分页查询链上事件...');

    try {
      while (true) {
        pageCount++;
        const response: any = await this.client.queryEvents({
          query: {
            MoveEventType: `${this.packageId}::privacy_pool::DepositEvent`,
          },
          limit,
          cursor: cursor || undefined,
          order: 'ascending',
        });

        const events = response.data.map((event: any, eventIdx: number) => {
          const rawCommitment = event.parsedJson?.commitment;

          //  调试：打印第一个事件的原始commitment格式
          if (pageCount === 1 && eventIdx === 0) {
            debugLog('\n === 第一个事件的原始数据 ===');
            debugLog(' rawCommitment类型:', Array.isArray(rawCommitment) ? 'Array' : typeof rawCommitment);
            debugLog(' rawCommitment值:', rawCommitment);
            if (Array.isArray(rawCommitment)) {
              debugLog(' 数组长度:', rawCommitment.length);
              debugLog(' 前8字节:', rawCommitment.slice(0, 8).map((b: number) => '0x' + b.toString(16).padStart(2, '0')).join(' '));
            }
            debugLog(' ===========================\n');
          }

          return {
            commitment: this.parseCommitment(rawCommitment),
            amount: Number(event.parsedJson?.amount),
            currency: 'USDH',
            leafIndex: Number(event.parsedJson?.leaf_index),
            timestamp: Number(event.parsedJson?.timestamp),
          };
        });

        allEvents = allEvents.concat(events);

        debugLog(`📄 第 ${pageCount} 页：获取 ${events.length} 个事件（累计 ${allEvents.length} 个）`);

        // 检查是否还有更多数据
        if (!response.hasNextPage || !response.nextCursor) {
          debugLog(' 所有事件查询完成');
          break;
        }

        cursor = response.nextCursor;
      }

      return allEvents;
    } catch (error) {
      console.error(' 分页查询创建事件失败:', error);
      throw new Error(`无法获取完整的创建事件列表: ${error}`);
    }
  }

  /**
   * 查询兑换支票事件
   */
  async queryRedeemEvents(limit = 1000): Promise<VoucherRedeemEvent[]> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::privacy_pool::WithdrawalEvent`,
        },
        limit,
      });

      return events.data.map((event: any) => ({
        nullifierHash: event.parsedJson?.nullifier_hash as string,
        recipient: event.parsedJson?.recipient as string,
        amount: Number(event.parsedJson?.amount),
        currency: 'USDH', // TODO: 从事件中解析币种
        timestamp: Number(event.parsedJson?.timestamp),
      }));
    } catch (error) {
      console.error('Failed to query redeem events:', error);
      return [];
    }
  }

  /**
   * 获取支票统计信息
   */
  async getStats(): Promise<VoucherStats> {
    const [created, redeemed] = await Promise.all([
      this.queryCreateEvents(),
      this.queryRedeemEvents(),
    ]);

    const totalCreatedValue = created.reduce((sum, e) => sum + e.amount, 0);
    const totalRedeemedValue = redeemed.reduce((sum, e) => sum + e.amount, 0);
    const issuedValue = totalCreatedValue - totalRedeemedValue;

    return {
      totalCreated: created.length,
      totalRedeemed: redeemed.length,
      totalValue: `${totalCreatedValue / 1e9} USDH`,
      issued: created.length - redeemed.length,
      issuedValue: `${issuedValue / 1e9} USDH`,
    };
  }

  /**
   * 检查支票是否已兑换
   */
  async isVoucherRedeemed(voucherCode: string): Promise<boolean> {
    const parsed = parseVoucherCode(voucherCode);
    if (!parsed) return false;

    // parsed.nullifier 已经是 bigint 类型（新格式）
    const nullifierHash = computePedersenNullifierHash(parsed.nullifier);
    const redeemed = await this.queryRedeemEvents();

    return redeemed.some((e) => e.nullifierHash === nullifierHash);
  }

  /**
   * 基于链上 nullifier 状态检查支票是否已兑换
   * 使用 checkVouchersSpentStatus 进行链上查询
   */
  async isVoucherRedeemedOnChain(
    voucherCode: string,
    signer: any,
  ): Promise<boolean> {
    const parsed = parseVoucherCode(voucherCode);
    if (!parsed) {
      throw new Error('Invalid voucher code format');
    }

    const voucher: Voucher = {
      id: voucherCode,
      accountAddress: '',
      network: this.network,
      currency: 'USDH',
      amount: `${parsed.amount / 1e9} USDH`,
      denomination: parsed.amount,
      commitment: '0x0',
      nullifier: `0x${parsed.nullifier.toString(16).padStart(64, '0')}`,
      secret: '0x0',
      nullifierHash: '0x0',
      leafIndex: parsed.leafIndex,
      timestamp: Date.now(),
      voucherCode,
      redeemed: false,
    };

    const [spent] = await this.checkVouchersSpentStatus([voucher], signer);
    return spent === true;
  }

  /**
   * 获取当前 Merkle 根
   */
  getCurrentRoot(): string {
    return this.merkleTree.getRoot();
  }

  /**
   * 获取网络信息
   */
  getNetwork(): 'oct' | 'oct-testnet' {
    return this.network;
  }
}

export default VoucherClient;
