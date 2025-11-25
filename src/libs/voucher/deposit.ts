import { Transaction } from '@mysten/sui/transactions';
import { Transaction as TransactionOct } from '@onelabs/sui/transactions';

import {
  VOUCHER_CONFIG,
  formatVoucherCode,
  getCoinType,
} from '@/constants/voucher';
import {
  calculatePoolFee,
  type PrivacyPoolOnChainConfig,
} from '@/libs/privacyPool/config';
import {
  generateDepositSecrets as generatePedersenDepositSecrets,
  hexToBytes as pedersenHexToBytes,
} from '@/utils/crypto/pedersen';
import type { Voucher, CreateVoucherParams, VoucherSigningContext } from '@/types/voucher';
import { VoucherErrorCode, createVoucherError } from '@/utils/voucherError';
import {
  executeWithSponsoredGas,
  isExecutionFailureError,
  shouldUseSponsoredGas,
  type SponsoredExecutionDeps,
} from '@/libs/voucher/sponsor';

export interface DepositContext {
  network: 'oct' | 'oct-testnet';
  isOct: boolean;
  packageId: string;
  configId: string;
  gasPoolEnabled: boolean;
  gasBudgetValue: number;
  client: any;
  loadPoolConfig: () => Promise<PrivacyPoolOnChainConfig>;
  getSenderAddress: (signer: any) => Promise<string>;
  resolveEventsWithFallback: (executionResult: Record<string, unknown>) => Promise<any[]>;
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

export async function createVoucherWithDeposit(
  params: CreateVoucherParams,
  signingContext: VoucherSigningContext,
  ctx: DepositContext,
): Promise<{ voucher: Voucher; digest: string }> {
  const { currency, amount, coinIds } = params;

  // 验证币种：当前合约只支持 USDH（合约硬编码）
  if (currency !== 'USDH') {
    throw new Error(
      `当前只支持 USDH 币种。OCT 链的 privacy_pool 合约硬编码了 USDH 类型，` +
      `暂不支持 ${currency}。请切换到 USDH 进行操作。`,
    );
  }

  const poolConfig = await ctx.loadPoolConfig();
  const noteDenomination = Number(poolConfig.noteDenomination);
  if (amount !== noteDenomination) {
    throw new Error(
      `当前支票面额固定为 ${noteDenomination}. 检测到不一致的金额 ${amount}, 请刷新页面后重试。`,
    );
  }
  const depositFee = calculatePoolFee(
    poolConfig.noteDenomination,
    poolConfig.depositFixedFee,
    poolConfig.depositFeeBps,
  );
  const totalRequired = poolConfig.noteDenomination + depositFee;
  ctx.debugLog(
    `开支票需要 note ${poolConfig.noteDenomination.toString()} + fee ${depositFee.toString()} = ${totalRequired.toString()}`,
  );

  // 生成随机的 nullifier 和 secret
  // Phase 2: 使用 Pedersen hash（与 privacy-sui 一致）
  const { nullifier, secret, commitment, nullifierHash } =
    generatePedersenDepositSecrets();

  // 获取币种类型
  const coinType = getCoinType(ctx.network, currency);
  if (!coinType) {
    throw new Error(`Unsupported currency: ${currency} on network: ${ctx.network}`);
  }

  // 创建交易 (根据网络选择对应的 Transaction 类)
  const tx = ctx.isOct ? new TransactionOct() : new Transaction();

  if (!coinIds.length) {
    throw new Error('未提供可用于支付的 Coin 对象');
  }

  const primaryCoin = tx.object(coinIds[0]);
  const additionalCoins = coinIds.slice(1).map((id: string) => tx.object(id));
  if (additionalCoins.length > 0) {
    tx.mergeCoins(primaryCoin, additionalCoins);
  }

  // 调用 deposit 函数
  // 注意：合约函数已改为泛型，需要传入稳定币类型
  // 重要：commitment 字节需要反转为小端序（little-endian），参考 privacy-sui 示例工程
  tx.moveCall({
    target: `${ctx.packageId}::privacy_pool::deposit`,
    typeArguments: [coinType],
    arguments: [
      tx.object(ctx.configId),
      //  修复 #1: 反转字节序为小端序（与工作示例一致）
      tx.pure.vector('u8', [...pedersenHexToBytes(commitment)].reverse()),
      primaryCoin,
      tx.object(VOUCHER_CONFIG.CLOCK_OBJECT_ID),
    ],
  });

  // ============ Phase 3: Gas 预算 ============
  const senderAddress = await ctx.getSenderAddress(signingContext.signer);
  tx.setSender(senderAddress);

  let calculatedGasBudget = ctx.gasBudgetValue;

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
    ctx.debugLog('执行 dry-run 进行 gas 估算...');
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
      } else {
        throw createVoucherError(VoucherErrorCode.TRANSACTION_VALIDATION_FAILED);
      }
    }

    const computationCost = BigInt(dryRunRes.effects.gasUsed.computationCost);
    const storageCost = BigInt(dryRunRes.effects.gasUsed.storageCost);
    const storageRebate = BigInt(dryRunRes.effects.gasUsed.storageRebate);

    let neededGas = computationCost + storageCost - storageRebate;
    neededGas = neededGas + neededGas / 5n; // 添加 20% 缓冲

    ctx.debugLog(
      `Dry-run 成功。预估 gas: ${neededGas.toString()} (${Number(neededGas) / 1e9} OCT)`,
    );

    const MAX_GAS_BUDGET = 50_000_000_000; // 最大 50 OCT
    if (Number(neededGas) > MAX_GAS_BUDGET) {
      ctx.debugWarn(
        `计算的 gas ${Number(neededGas)} 超过最大值 ${MAX_GAS_BUDGET}`,
      );
      throw createVoucherError(VoucherErrorCode.GAS_EXCEEDS_MAXIMUM);
    }

    calculatedGasBudget = Number(neededGas);
    tx.setGasBudget(calculatedGasBudget);
  } else {
    tx.setGasBudget(calculatedGasBudget);
  }

  // ============ End Dry-run ============

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
        calculatedGasBudget,
      );
    } catch (sponsorshipError) {
      if (isExecutionFailureError(sponsorshipError)) {
        throw sponsorshipError;
      }
      console.warn('Gas sponsorship failed, falling back to self-funded transaction', sponsorshipError);
    }
  }

  if (!result) {
    const fallbackResult = await ctx.executeWithUserGas(tx, signingContext, txOptions);
    result = ctx.normalizeExecutionResult(fallbackResult);
  }

  const executionResult = result;
  const resolvedEvents = await ctx.resolveEventsWithFallback(executionResult);

  // 解析事件获取 leafIndex
  let leafIndex = -1;
  if (resolvedEvents.length > 0) {
    for (const event of resolvedEvents) {
      if (event.type?.includes('DepositEvent')) {
        leafIndex = Number(event.parsedJson?.leaf_index ?? -1);
        break;
      }
    }
  }

  // 验证 leafIndex 是否成功提取
  if (leafIndex < 0) {
    throw new Error('Failed to extract leafIndex from DepositEvent. Please check transaction events.');
  }

  ctx.debugLog('成功提取 leafIndex:', leafIndex);

  // 生成支票码 (privacy-sui compatible format - 新格式)
  // 使用原始单位金额，leafIndex，nullifier 和 secret 转为 BigInt
  const voucherCode = formatVoucherCode({
    amount: amount,  // 原始单位（如 1000000000 = 1 USDH）
    leafIndex: leafIndex,  // 从 DepositEvent 提取的叶子索引
    nullifier: BigInt(nullifier),
    secret: BigInt(secret),
  });

  // 创建支票对象
  const voucher: Voucher = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    accountAddress: '', // filled by caller when persisting
    network: ctx.network,
    currency,
    amount: `${noteDenomination / 1e9} ${currency}`,
    denomination: noteDenomination,
    commitment,
    nullifier,
    secret,
    nullifierHash,
    leafIndex,
    timestamp: Date.now(),
    voucherCode,
    redeemed: false,
    txDigest: result.digest,
  };

  return {
    voucher,
    digest: result.digest,
  };
}
