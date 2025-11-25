/**
 * Privacy Pool Client SDK
 * 基于 Tornado Cash 的 Sui 隐私池客户端
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import type {
  DepositNote,
  DepositParams,
  WithdrawParams,
  PrivacyPoolStats,
  PrivacyPoolConfig,
  DepositEvent,
  WithdrawalEvent,
} from '@/types/privacyPool';
import { PRIVACY_POOL_CONFIG, formatNote } from '@/constants/privacyPool';
import { MiMCUtils } from '@/utils/crypto/mimc';
import {
  generateDepositSecrets as generatePedersenDepositSecrets,
  hexToBytes as pedersenHexToBytes,
} from '@/utils/crypto/pedersen';
import { MerkleTree } from '@/utils/crypto/merkleTree';
import oneTransferApi, { type ProofRequest, createOneTransferApi } from '@/onechain/api/oneTransferApi';

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
  config: RetryConfig = DEFAULT_RETRY_CONFIG
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
        console.error('❌ 检测到致命错误，停止重试:', lastError.message);
        throw lastError;
      }

      // 最后一次尝试失败
      if (attempt === config.maxAttempts) {
        console.error(`❌ 重试${config.maxAttempts}次后仍然失败`);
        throw lastError;
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );

      debugWarn(
        `⚠️ 尝试 ${attempt}/${config.maxAttempts} 失败: ${lastError.message}\n` +
        `🔄 等待 ${delay/1000} 秒后重试...`
      );

      // 通知回调
      config.onRetry?.(attempt, delay, lastError);

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export class PrivacyPoolClient {
  private client: SuiClient;
  private packageId: string;
  private configId: string;
  private merkleTree: MerkleTree;
  private lastSyncTime = 0;
  private isTestnet: boolean;

  constructor(
    rpcUrl: string,
    packageId: string = PRIVACY_POOL_CONFIG.PACKAGE_ID,
    configId: string = PRIVACY_POOL_CONFIG.CONFIG_ID,
  ) {
    this.client = new SuiClient({ url: rpcUrl });
    this.packageId = packageId;
    this.configId = configId;
    this.merkleTree = new MerkleTree();
    // 检测是否是testnet环境
    this.isTestnet = rpcUrl.includes('testnet');
  }

  /**
   * 生成存款 Note
   */
  async generateDeposit(denomination: number, network: string): Promise<DepositNote> {
    const { nullifier, secret, commitment, nullifierHash } = generatePedersenDepositSecrets();

    const note: DepositNote = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      network,
      amount: `${denomination / 1e9} SUI`, // 转换为 SUI 单位显示
      denomination,
      commitment,
      nullifier,
      secret,
      nullifierHash,
      leafIndex: -1, // 存款确认后更新
      timestamp: Date.now(),
      noteString: '',
      spent: false,
    };

    // 生成 note 字符串
    note.noteString = formatNote({
      network,
      amount: note.amount,
      netId: 1, // 假设 mainnet
      commitment,
      nullifier,
      secret,
    });

    return note;
  }

  /**
   * 创建存款交易
   */
  async createDepositTransaction(params: DepositParams): Promise<Transaction> {
    const { amount, commitment, coinIds } = params;

    const tx = new Transaction();

    // 合并 coins
    if (coinIds.length > 1) {
      tx.mergeCoins(
        tx.object(coinIds[0]),
        coinIds.slice(1).map((id: string) => tx.object(id)),
      );
    }

    // 分割出存款金额
    const [depositCoin] = tx.splitCoins(tx.object(coinIds[0]), [tx.pure.u64(amount)]);

    // 调用 deposit 函数
    tx.moveCall({
      target: `${this.packageId}::privacy_pool::deposit`,
      arguments: [
        tx.object(this.configId),                      // config
        tx.pure.vector('u8', Array.from(pedersenHexToBytes(commitment))), // commitment
        tx.makeMoveVec({ elements: [depositCoin] }),   // coins
        tx.pure.u64(amount),                          // amount
        tx.object(PRIVACY_POOL_CONFIG.CLOCK_OBJECT_ID), // clock
      ],
    });

    // 设置 gas budget 为 5 OCT (隐私池业务需要更高的 gas)
    tx.setGasBudget(5000000000);

    return tx;
  }

  /**
   * 执行存款
   */
  async deposit(
    note: DepositNote,
    coinIds: string[],
    signer: any,
  ): Promise<{ digest: string; events: DepositEvent[] }> {
    const tx = await this.createDepositTransaction({
      amount: note.denomination,
      commitment: note.commitment,
      coinIds,
    });

    // 签名并执行
    const result = await this.client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: {
        showEvents: true,
        showEffects: true,
      },
    });

    // 解析存款事件
    const events = this.parseDepositEvents(result.events || []);

    // 更新 note 的 leafIndex
    if (events.length > 0) {
      note.leafIndex = events[0].leafIndex;
      note.txDigest = result.digest;
    }

    return {
      digest: result.digest,
      events,
    };
  }

  /**
   * 生成提款证明
   *
   * ✅ 已集成后端ZK证明生成服务
   *
   * 使用后端API生成真实的Groth16证明，确保链上验证能够通过。
   *
   * 证明生成流程：
   * 1. 同步Merkle树确保最新状态
   * 2. 生成Merkle proof (20层sibling hashes)
   * 3. 构造公开输入和私有输入
   * 4. 调用后端API生成Groth16证明 (10-30秒)
   * 5. 解析并返回证明数据
   *
   * @param note - 存款凭证
   * @param recipient - 接收地址
   * @param relayer - 中继地址 (默认0x0)
   * @param fee - 中继费用 (默认0)
   * @returns 证明和公开输入
   * @throws {Error} Merkle树同步失败、证明生成失败、网络错误等
   */
  async generateWithdrawalProof(
    note: DepositNote,
    recipient: string,
    relayer = '0x0',
    fee = 0,
  ): Promise<{
    proof: Uint8Array;
    publicInputs: any;
  }> {
    // 🔄 使用重试机制同步和验证 Merkle Tree
    const onChainRoot: string = await retryWithBackoff(async (): Promise<string> => {
      // Step 1: 🔑 强制同步 Merkle Tree（类似 privacy-sui 的 rebuild-commitments）
      debugLog('📡 步骤1/6：从链上同步最新数据（强制重建 Merkle Tree）...');
      await this.syncMerkleTree(true);  // force = true，忽略缓存

      // Step 2: 🔑 从链上获取当前有效的 Merkle Root
      debugLog('📡 步骤2/6：查询链上 Merkle Root...');
      const configObject = await this.client.getObject({
        id: this.configId,
        options: { showContent: true }
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

      debugLog(`📊 链上状态: ${onChainNextIndex} 个承诺, 当前根索引: ${currentRootIndex}`);
      debugLog(`🎯 链上根: ${rootValue}`);

      // Step 3: 严格验证本地树与链上状态的一致性
      debugLog('📡 步骤3/6：验证 Merkle Tree 完整性...');
      const localRoot = this.merkleTree.getRoot();
      const localLeafCount = this.merkleTree.getLeafCount();

      // 3.1 验证承诺数量必须一致
      if (localLeafCount !== onChainNextIndex) {
        throw new Error(
          `❌ Merkle树同步失败：本地承诺数量 (${localLeafCount}) 与链上数量 (${onChainNextIndex}) 不匹配。\n\n` +
          `可能原因：检测到新的存款事件尚未被索引完成。\n` +
          `系统将自动重试同步...`
        );
      }

      debugLog(`✅ 承诺数量验证通过：${localLeafCount} 个`);

      // 3.2 验证 Merkle 根必须一致
      if (localRoot !== rootValue) {
        throw new Error(
          `❌ Merkle根验证失败：本地根与链上根不匹配。\n\n` +
          `本地根: ${localRoot}\n` +
          `链上根: ${rootValue}\n\n` +
          `可能原因：\n` +
          `  1. Commitment 解析错误\n` +
          `  2. 哈希算法与链上不一致\n` +
          `  3. 事件数据损坏或顺序错误\n\n` +
          `⚠️ 这是致命错误，将停止重试。\n` +
          `建议：请联系技术支持检查链上数据。`
        );
      }

      debugLog('✅ Merkle根验证通过');
      debugLog('✅ 本地树与链上状态完全一致');

      return rootValue;
    });

    // Step 4: 检查 note 是否在树中
    if (note.leafIndex < 0 || note.leafIndex >= this.merkleTree.getLeafCount()) {
      throw new Error('支票未找到：该支票不在Merkle树中，可能尚未确认或已被使用');
    }

    // Step 5: 生成 Merkle Proof（基于强制同步后的最新数据）
    debugLog('📡 步骤4/6：生成 Merkle Proof（基于最新同步的数据）...');
    const merkleProof = this.merkleTree.generateProof(note.leafIndex);

    // Step 6: 验证 Merkle Proof 正确性
    if (!this.merkleTree.verifyProof(merkleProof)) {
      throw new Error('Merkle证明生成失败：本地验证未通过');
    }

    debugLog('✅ Merkle Proof 生成并验证成功');
    debugLog(`📊 Path 长度: ${merkleProof.pathElements.length} 层`);

    // Step 7: 构造公开输入（使用链上根 + 本地计算的 path）
    debugLog('📡 步骤5/6：准备证明请求参数...');
    const publicInputs = {
      root: onChainRoot,  // ✅ 使用链上根（遵循 safe-withdraw）
      nullifierHash: note.nullifierHash,
      recipient: MiMCUtils.addressToField(recipient),
      relayer: MiMCUtils.addressToField(relayer),
      fee: MiMCUtils.numberToField(fee),
      refund: MiMCUtils.numberToField(note.denomination),
    };

    // Step 8: 准备后端API请求参数（使用链上根）
    const proofRequest: ProofRequest = {
      // 按照参考请求顺序排列：refund, nullifier, root, nullifier_hash, secret, path_indices, recipient, path_elements
      // 重要：后端服务器期望 refund 为 u64 整数类型，而不是字符串！
      refund: note.denomination,  // 保持为数字类型 (u64)
      nullifier: note.nullifier,
      root: onChainRoot,  // ✅ 使用链上根
      nullifier_hash: note.nullifierHash,
      secret: note.secret,
      path_indices: merkleProof.pathIndices,
      recipient: recipient,
      // 关键修复：path_elements 需要对 BN254 字段取模，确保在有效范围内
      path_elements: merkleProof.pathElements.map(el => (BigInt(el) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')).toString()),
    };

    try {
      // Step 6: 调用后端API生成真实的Groth16证明
      debugLog('📡 步骤6/6：调用后端生成零知识证明（预计需要10-30秒）...');
      debugLog('📋 证明请求参数:', JSON.stringify(proofRequest, null, 2));
      const startTime = Date.now();

      const api = createOneTransferApi(this.isTestnet);
      const response = await api.getProof(proofRequest);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      debugLog(`✅ 证明生成成功 (耗时: ${elapsedTime}秒)`);

      // Step 8: 解析后端返回的证明数据
      const proofBytes = this.parseProofString(response.proof);

      // 验证证明长度 (Groth16证明应该是256字节，但后端暂时返回128字节)
      if (proofBytes.length !== 128 && proofBytes.length !== 256) {
        throw new Error(`证明长度异常: 期望128或256字节，实际${proofBytes.length}字节`);
      }
      
      // 警告非标准格式
      if (proofBytes.length === 128) {
        debugWarn('⚠️ 警告：返回的证明长度不符合标准Groth16格式 (128字节 vs 256字节)');
        debugLog('📊 证明长度信息:', proofBytes.length, '字节');
      }

      // 解析公开输入 (如果后端返回了)
      let parsedPublicInputs = publicInputs;
      if (response.public_inputs) {
        try {
          // 后端返回的是十六进制字符串，直接使用
          debugLog('📋 使用后端返回的public_inputs:', response.public_inputs);
          // 可以在这里添加对后端返回的public_inputs的处理逻辑
          // 目前保持使用本地计算的publicInputs
        } catch (e) {
          debugWarn('后端返回的public_inputs处理失败，使用本地计算的值', e);
        }
      }

      return {
        proof: proofBytes,
        publicInputs: parsedPublicInputs,
      };
    } catch (error: any) {
      // Step 9: 错误处理
      console.error('❌ 零知识证明生成失败:', error);
      console.error('📄 错误详情:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      });

      // 提供友好的错误提示
      if (error.message?.includes('timeout') || error.message?.includes('ECONNABORTED')) {
        throw new Error('证明生成超时：服务器响应时间过长，请重试');
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        throw new Error('网络错误：无法连接到证明生成服务，请检查网络连接');
      } else if (error.response?.status === 500) {
        throw new Error(`服务器内部错误：${error.response?.data?.message || '证明生成服务出错'}`);
      } else if (error.response?.status === 400) {
        throw new Error(`请求参数错误：${error.response?.data?.message || '请求格式不正确'}`);
      } else if (error.response?.status === 404) {
        throw new Error('证明生成接口未找到');
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

    // 确保是偶数长度
    if (hex.length % 2 !== 0) {
      throw new Error('无效的证明格式：十六进制字符串长度必须是偶数');
    }

    // 转换为字节数组
    return pedersenHexToBytes('0x' + hex);
  }

  /**
   * 创建提款交易
   */
  async createWithdrawTransaction(params: WithdrawParams): Promise<Transaction> {
    const { note, recipient, relayer = '0x0', fee = 0 } = params;

    // 生成证明
    const { proof, publicInputs } = await this.generateWithdrawalProof(
      note,
      recipient,
      relayer,
      fee,
    );

    const tx = new Transaction();

    tx.moveCall({
      target: `${this.packageId}::privacy_pool::withdraw`,
      arguments: [
        tx.object(this.configId),                      // config
        tx.pure.vector('u8', Array.from(proof)),      // proof
        tx.pure.u256(BigInt(publicInputs.root)),      // root
        tx.pure.vector('u8', Array.from(pedersenHexToBytes(note.nullifierHash))), // nullifier_hash
        tx.pure.u64(note.denomination),               // amount
        tx.object(PRIVACY_POOL_CONFIG.CLOCK_OBJECT_ID), // clock
      ],
    });

    // 设置 gas budget 为 5 OCT (隐私池业务需要更高的 gas)
    tx.setGasBudget(5000000000);

    return tx;
  }

  /**
   * 执行提款
   */
  async withdraw(
    params: WithdrawParams,
    signer: any,
  ): Promise<{ digest: string; events: WithdrawalEvent[] }> {
    const tx = await this.createWithdrawTransaction(params);

    const result = await this.client.signAndExecuteTransaction({
      signer,
      transaction: tx,
      options: {
        showEvents: true,
        showEffects: true,
      },
    });

    // 解析提款事件
    const events = this.parseWithdrawalEvents(result.events || []);

    return {
      digest: result.digest,
      events,
    };
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
  async syncMerkleTree(force: boolean = false): Promise<void> {
    const now = Date.now();

    // 如果不是强制同步，检查缓存
    if (!force && now - this.lastSyncTime < 5000) {
      debugLog('⚡ Merkle树同步时间间隔太短，使用缓存');
      return;
    }

    if (force) {
      debugLog('🔄 执行完全重建（类似 safe-withdraw 的 rebuild-commitments）...');
    } else {
      debugLog('🔄 同步 Merkle Tree...');
    }

    // 查询事件：强制模式使用分页查询获取所有事件
    const events = force
      ? await this.queryAllDepositEvents()     // ✅ 分页查询，获取所有事件
      : await this.queryDepositEvents();       // 普通查询，limit=1000

    debugLog(`📊 获取到 ${events.length} 个存款事件`);

    // 清空并重建树
    this.merkleTree.clear();

    // 按 leafIndex 排序
    events.sort((a, b) => a.leafIndex - b.leafIndex);

    // 插入所有承诺
    for (const event of events) {
      this.merkleTree.insert(event.commitment);
    }

    debugLog(`✅ Merkle Tree 重建完成：${events.length} 个叶子节点`);
    debugLog(`📊 当前本地根: ${this.merkleTree.getRoot()}`);

    this.lastSyncTime = now;
  }

  /**
   * 查询存款事件
   */
  async queryDepositEvents(limit = 1000): Promise<DepositEvent[]> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::privacy_pool::DepositEvent`,
        },
        limit,
      });

      return events.data.map((event) => this.parseDepositEvent(event));
    } catch (error) {
      console.error('Failed to query deposit events:', error);
      return [];
    }
  }

  /**
   * 查询所有存款事件（支持分页）
   *
   * 类似 privacy-sui 的 rebuild-commitments，确保获取所有链上事件。
   * 使用分页机制避免 limit 限制导致的数据不完整问题。
   *
   * @returns 所有存款事件的完整列表
   */
  private async queryAllDepositEvents(): Promise<DepositEvent[]> {
    let allEvents: DepositEvent[] = [];
    let cursor: any = null;  // EventId type from @mysten/sui
    const limit = 1000;
    let pageCount = 0;

    debugLog('📡 开始分页查询链上事件...');

    try {
      while (true) {
        pageCount++;
        const response = await this.client.queryEvents({
          query: {
            MoveEventType: `${this.packageId}::privacy_pool::DepositEvent`,
          },
          limit,
          cursor: cursor || undefined,
        });

        const events = response.data.map((event) => this.parseDepositEvent(event));
        allEvents = allEvents.concat(events);

        debugLog(`📄 第 ${pageCount} 页：获取 ${events.length} 个事件（累计 ${allEvents.length} 个）`);

        // 检查是否还有更多数据
        if (!response.hasNextPage || !response.nextCursor) {
          debugLog('✅ 所有事件查询完成');
          break;
        }

        cursor = response.nextCursor;
      }

      return allEvents;
    } catch (error) {
      console.error('❌ 分页查询存款事件失败:', error);
      throw new Error(`无法获取完整的存款事件列表: ${error}`);
    }
  }

  /**
   * 查询提款事件
   */
  async queryWithdrawalEvents(limit = 1000): Promise<WithdrawalEvent[]> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::privacy_pool::WithdrawalEvent`,
        },
        limit,
      });

      return events.data.map((event) => this.parseWithdrawalEvent(event));
    } catch (error) {
      console.error('Failed to query withdrawal events:', error);
      return [];
    }
  }

  /**
   * 获取隐私池统计信息
   */
  async getStats(): Promise<PrivacyPoolStats> {
    const [deposits, withdrawals] = await Promise.all([
      this.queryDepositEvents(),
      this.queryWithdrawalEvents(),
    ]);

    const totalBalance = deposits.reduce((sum, d) => sum + d.amount, 0) -
      withdrawals.reduce((sum, w) => sum + w.amount, 0);

    const avgDepositAmount = deposits.length > 0
      ? deposits.reduce((sum, d) => sum + d.amount, 0) / deposits.length
      : 0;

    return {
      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      totalBalance: `${totalBalance / 1e9} SUI`,
      anonymitySet: deposits.length - withdrawals.length,
      avgDepositAmount: `${avgDepositAmount / 1e9} SUI`,
      lastDepositTime: deposits[deposits.length - 1]?.timestamp || 0,
      lastWithdrawalTime: withdrawals[withdrawals.length - 1]?.timestamp || 0,
    };
  }

  /**
   * 解析存款事件
   */
  private parseDepositEvent(event: any): DepositEvent {
    const { commitment, amount, leaf_index, timestamp } = event.parsedJson;
    return {
      commitment,
      amount: Number(amount),
      leafIndex: Number(leaf_index),
      timestamp: Number(timestamp),
    };
  }

  /**
   * 解析提款事件
   */
  private parseWithdrawalEvent(event: any): WithdrawalEvent {
    const { nullifier_hash, recipient, amount, timestamp } = event.parsedJson;
    return {
      nullifierHash: nullifier_hash,
      recipient,
      amount: Number(amount),
      timestamp: Number(timestamp),
    };
  }

  /**
   * 解析存款事件列表
   */
  private parseDepositEvents(events: any[]): DepositEvent[] {
    return events
      .filter((e) => e.type.includes('DepositEvent'))
      .map((e) => this.parseDepositEvent(e));
  }

  /**
   * 解析提款事件列表
   */
  private parseWithdrawalEvents(events: any[]): WithdrawalEvent[] {
    return events
      .filter((e) => e.type.includes('WithdrawalEvent'))
      .map((e) => this.parseWithdrawalEvent(e));
  }

  /**
   * 获取 Merkle Tree
   */
  getMerkleTree(): MerkleTree {
    return this.merkleTree;
  }

  /**
   * 获取当前 Merkle 根
   */
  getCurrentRoot(): string {
    return this.merkleTree.getRoot();
  }

  /**
   * 检查 nullifier 是否已使用
   */
  async isNullifierUsed(nullifierHash: string): Promise<boolean> {
    const withdrawals = await this.queryWithdrawalEvents();
    return withdrawals.some((w) => w.nullifierHash === nullifierHash);
  }
}

export default PrivacyPoolClient;
