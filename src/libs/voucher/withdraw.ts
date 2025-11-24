import { Transaction } from '@mysten/sui/transactions';
import { Transaction as TransactionOct } from '@onelabs/sui/transactions';

import { VOUCHER_CONFIG, getCoinType, parseVoucherCode } from '@/constants/voucher';
import type { Voucher, RedeemVoucherParams, VoucherSigningContext } from '@/types/voucher';
import {
  computeCommitment as computePedersenCommitment,
  computeNullifierHash as computePedersenNullifierHash,
  hexToBytes as pedersenHexToBytes,
} from '@/utils/crypto/pedersen';
import { calculatePoolFee, type PrivacyPoolOnChainConfig } from '@/libs/privacyPool/config';
import {
  executeWithSponsoredGas,
  isExecutionFailureError,
  shouldUseSponsoredGas,
  type SponsoredExecutionDeps,
} from '@/libs/voucher/sponsor';
import { createVoucherError, VoucherErrorCode } from '@/utils/voucherError';
import type { MerkleTree } from '@/utils/crypto/merkleTree';

export interface WithdrawContext {
  network: 'oct' | 'oct-testnet';
  isOct: boolean;
  packageId: string;
  configId: string;
  gasPoolEnabled: boolean;
  gasBudgetValue: number;
  client: any;
  merkleTree: MerkleTree;
  loadPoolConfig: () => Promise<PrivacyPoolOnChainConfig>;
  getSenderAddress: (signer: any) => Promise<string>;
  generateWithdrawalProof: (
    voucher: Voucher,
    recipient: string,
    relayer: string,
    fee: number,
  ) => Promise<{
    proof: Uint8Array;
    publicInputs: any;
    merkleProof: any;
    proofLength: number;
    isStandardLength: boolean;
  }>;
  executeWithUserGas: (
    tx: Transaction | TransactionOct,
    signingContext: VoucherSigningContext,
    options?: Record<string, unknown>,
  ) => Promise<any>;
  normalizeExecutionResult: (result: unknown) => Record<string, unknown>;
  getSponsoredExecutionDeps: () => SponsoredExecutionDeps;
  detectVoucherErrorCodeFromError: (error: unknown) => VoucherErrorCode | null;
  resolveVoucherErrorCode: (error: unknown, fallback: VoucherErrorCode) => VoucherErrorCode;
  debugLog: (...args: any[]) => void;
  debugWarn: (...args: any[]) => void;
}

export async function redeemVoucherWithWithdraw(
  params: RedeemVoucherParams,
  signingContext: VoucherSigningContext,
  ctx: WithdrawContext,
): Promise<{ digest: string; amount: number }> {
  const { voucherCode, recipient, relayer = '0x0', fee = 0 } = params;

  // 解析支票码 (privacy-sui compatible format)
  const parsed = parseVoucherCode(voucherCode);
  if (!parsed) {
    throw new Error('Invalid voucher code format');
  }

  // 从钱包连接推断网络和币种（与 privacy-sui 一致）
  // 新格式不包含 network 和 currency，从当前客户端实例获取
  const network = ctx.network;
  const currency = 'USDH';  // 当前合约仅支持 USDH
  const coinType = getCoinType(ctx.network, currency);
  if (!coinType) {
    throw new Error(`Unsupported currency: ${currency} on network: ${ctx.network}`);
  }
  const poolConfig = await ctx.loadPoolConfig();
  const expectedDenomination = Number(poolConfig.noteDenomination);
  if (parsed.amount !== expectedDenomination) {
    ctx.debugWarn(
      `Voucher amount ${parsed.amount} does not match on-chain denomination ${expectedDenomination}. Using config value.`,
    );
  }
  const withdrawFee = calculatePoolFee(
    poolConfig.noteDenomination,
    poolConfig.withdrawFixedFee,
    poolConfig.withdrawFeeBps,
  );
  if (withdrawFee <= 0n) {
    throw new Error('Withdraw fee configuration is invalid (must be greater than zero)');
  }

  // 计算 commitment 和 nullifierHash
  const nullifierStr = '0x' + parsed.nullifier.toString(16).padStart(64, '0');
  const secretStr = '0x' + parsed.secret.toString(16).padStart(64, '0');
  const commitment = computePedersenCommitment(parsed.nullifier, parsed.secret);
  const nullifierHash = computePedersenNullifierHash(parsed.nullifier);

  // 构造 voucher 对象用于生成证明
  const amount = expectedDenomination;
  const voucher: Voucher = {
    id: '',
    accountAddress: '', // redeem flow injects caller context
    network: network,
    currency: currency,
    amount: `${amount / 1e9} ${currency}`,  // 人类可读格式
    denomination: amount,
    commitment,
    nullifier: nullifierStr,
    secret: secretStr,
    nullifierHash: nullifierHash,
    leafIndex: parsed.leafIndex,  // 直接使用支票码中的 leafIndex
    timestamp: 0,
    voucherCode,
    redeemed: false,
  };

  ctx.debugLog(' 从支票码中提取 leafIndex:', voucher.leafIndex);
  ctx.debugLog(
    ' Commitment:',
    voucher.commitment,
    `(dec: ${BigInt(voucher.commitment).toString()})`,
  );

  // 生成提款证明 - 增强调试信息
  ctx.debugLog(' 生成提款证明参数:', {
    commitment: voucher.commitment,
    leafIndex: voucher.leafIndex,
    currentRoot: ctx.merkleTree.getRoot(),
    recipient,
    amount: amount,
  });

  const { proof, merkleProof, proofLength, isStandardLength } = await ctx.generateWithdrawalProof(
    voucher,
    recipient,
    relayer,
    fee,
  );

  // 验证Merkle根有效性
  ctx.debugLog(' 证明生成结果:', {
    proofRoot: merkleProof.root,
    currentTreeRoot: ctx.merkleTree.getRoot(),
    rootsMatch: merkleProof.root === ctx.merkleTree.getRoot(),
    proofLength,
    isStandardLength,
  });

  // 128 字节是 Groth16 BN254 压缩格式，是正确的
  if (proofLength === 128) {
    ctx.debugLog(` 证明长度: ${proofLength} 字节（Groth16 BN254 压缩格式）`);
  } else if (proofLength !== 256) {
    ctx.debugWarn(` 警告：证明长度异常 ${proofLength} 字节（期望 128 或 256 字节）`);
  }

  //  关键验证：确保使用的Root是当前有效的
  if (merkleProof.root !== ctx.merkleTree.getRoot()) {
    ctx.debugWarn(' 警告：证明使用的Root与当前树Root不匹配');
    ctx.debugLog('证明Root:', merkleProof.root);
    ctx.debugLog('当前Root:', ctx.merkleTree.getRoot());
    // 使用当前最新的Root，而不是证明中的Root
    merkleProof.root = ctx.merkleTree.getRoot();
  }

  // 创建提款交易 (根据网络选择对应的 Transaction 类)
  const tx = ctx.isOct ? new TransactionOct() : new Transaction();

  const senderAddress = await ctx.getSenderAddress(signingContext.signer);

  // 构建交易参数 - 使用验证后的Root
  const txArguments = [
    tx.object(ctx.configId),
    tx.pure.vector('u8', Array.from(proof)),
    tx.pure.u256(BigInt(merkleProof.root).toString()), // 转换为字符串，SUI SDK 期望 string 类型
    tx.pure.vector('u8', Array.from(pedersenHexToBytes(voucher.nullifierHash))),
    // Fee coin parameter removed in new contract version; fees deducted inside withdraw.
    tx.object(VOUCHER_CONFIG.CLOCK_OBJECT_ID),
  ];

  // 详细的交易参数日志（用于调试 proof 验证失败）
  ctx.debugLog('\n ==================== Withdraw 交易参数 ====================');
  ctx.debugLog('Config ID:', ctx.configId);
  ctx.debugLog('Proof:');
  ctx.debugLog('  - 长度:', proof.length, '字节');
  ctx.debugLog('  - 十六进制:', Array.from(proof).map(b => b.toString(16).padStart(2, '0')).join(''));
  ctx.debugLog('Root:');
  ctx.debugLog('  - 十六进制:', merkleProof.root);
  ctx.debugLog('  - 十进制:', BigInt(merkleProof.root).toString());
  ctx.debugLog('Nullifier Hash:');
  ctx.debugLog('  - 原始值:', voucher.nullifierHash);
  ctx.debugLog('  - 字节数组:', Array.from(pedersenHexToBytes(voucher.nullifierHash)));
  ctx.debugLog('Recipient:', recipient);
  ctx.debugLog('  - 地址 u256:', BigInt(recipient).toString());
  ctx.debugLog('Amount:', amount);
  ctx.debugLog('========================================================\n');

  tx.moveCall({
    target: `${ctx.packageId}::privacy_pool::withdraw`,
    typeArguments: [coinType],
    arguments: txArguments,
  });

  // ============ Phase 3: Gas 预算 ============
  tx.setSender(senderAddress);

  let finalGas = ctx.gasBudgetValue;

  if (!shouldUseSponsoredGas(ctx.gasPoolEnabled, ctx.gasBudgetValue)) {
    // Step 3: 构建交易
    let builtTx;
    try {
      builtTx = await tx.build({ client: ctx.client });
    } catch (buildError: any) {
      const errorCode = ctx.resolveVoucherErrorCode(buildError, VoucherErrorCode.TRANSACTION_BUILD_FAILED);
      throw createVoucherError(errorCode, buildError);
    }

    // Step 4: 执行 dry-run
    ctx.debugLog(' 执行兑换 dry-run 进行 gas 估算...');
    let dryRunRes;
    try {
      dryRunRes = await ctx.client.dryRunTransactionBlock({
        transactionBlock: builtTx,
      });
    } catch (dryRunError: any) {
      const mappedError = ctx.detectVoucherErrorCodeFromError(dryRunError) ?? VoucherErrorCode.RPC_ERROR;
      throw createVoucherError(mappedError, dryRunError);
    }

    // Step 5: 检查 dry-run 结果并识别具体错误类型
    if (dryRunRes.effects.status.status !== 'success') {
      const errorMsg = dryRunRes.effects.status.error || 'Unknown error';

      if (errorMsg.includes('InsufficientGas') || errorMsg.toLowerCase().includes('insufficient gas')) {
        throw createVoucherError(VoucherErrorCode.GAS_INSUFFICIENT);
      } else if (errorMsg.includes('InvalidGasObject')) {
        throw createVoucherError(VoucherErrorCode.GAS_OBJECT_INVALID);
      } else if (errorMsg.includes('InsufficientCoinBalance') || errorMsg.toLowerCase().includes('insufficient')) {
        throw createVoucherError(VoucherErrorCode.COIN_BALANCE_INSUFFICIENT);
      } else if (errorMsg.toLowerCase().includes('already') && errorMsg.toLowerCase().includes('redeem')) {
        throw createVoucherError(VoucherErrorCode.VOUCHER_ALREADY_REDEEMED);
      } else {
        throw createVoucherError(VoucherErrorCode.TRANSACTION_VALIDATION_FAILED);
      }
    }

    // Step 6: 计算 gas 并加 20% 安全缓冲
    const computationCost = BigInt(dryRunRes.effects.gasUsed.computationCost);
    const storageCost = BigInt(dryRunRes.effects.gasUsed.storageCost);
    const storageRebate = BigInt(dryRunRes.effects.gasUsed.storageRebate);

    let neededGas = computationCost + storageCost - storageRebate;
    neededGas = neededGas + neededGas / 5n; // 添加 20% 缓冲

    ctx.debugLog(
      ` 兑换 Dry-run 成功。预估 gas: ${Number(neededGas) / 1e9} OCT`,
    );

    const MIN_GAS_BUDGET = 5_000_000_000;  // 最小 5 OCT（参考 privacy-sui）
    const MAX_GAS_BUDGET = 50_000_000_000; // 最大 50 OCT

    finalGas = Math.max(Number(neededGas), MIN_GAS_BUDGET);

    if (finalGas > MAX_GAS_BUDGET) {
      ctx.debugWarn(
        `计算的 gas ${finalGas} 超过最大值 ${MAX_GAS_BUDGET}`,
      );
      throw createVoucherError(VoucherErrorCode.GAS_EXCEEDS_MAXIMUM);
    }
  }

  ctx.debugLog(` 设置 gas budget: ${finalGas / 1e9} OCT`);
  tx.setGasBudget(finalGas);

  // 执行交易
  const txOptions = {
    showEvents: true,
    showEffects: true,
  };

  let result: any | null = null;

  if (shouldUseSponsoredGas(ctx.gasPoolEnabled, ctx.gasBudgetValue)) {
    try {
      result = await executeWithSponsoredGas(
        tx,
        signingContext,
        ctx.getSponsoredExecutionDeps(),
        finalGas,
      );
    } catch (sponsorshipError) {
      if (isExecutionFailureError(sponsorshipError)) {
        throw sponsorshipError;
      }
      console.warn('Gas sponsorship failed for redeem, falling back to user-funded execution', sponsorshipError);
    }
  }

  if (!result) {
    const fallbackResult = await ctx.executeWithUserGas(tx, signingContext, txOptions);
    result = ctx.normalizeExecutionResult(fallbackResult);
  }

  return {
    digest: result.digest,
    amount,
  };
}
