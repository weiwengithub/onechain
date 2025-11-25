/**
 * Voucher Error Handling Utilities
 * 统一的支票错误处理工具
 */

import { toastError } from '@/utils/toast';
import i18n from '@/lang/i18n';

/**
 * 支票错误码枚举
 */
export enum VoucherErrorCode {
  // Gas 相关错误
  GAS_INSUFFICIENT = 'GAS_INSUFFICIENT',
  GAS_OBJECT_INVALID = 'GAS_OBJECT_INVALID',
  GAS_EXCEEDS_MAXIMUM = 'GAS_EXCEEDS_MAXIMUM',

  // 余额相关错误
  COIN_BALANCE_INSUFFICIENT = 'COIN_BALANCE_INSUFFICIENT',

  // 交易相关错误
  TRANSACTION_VALIDATION_FAILED = 'TRANSACTION_VALIDATION_FAILED',
  TRANSACTION_BUILD_FAILED = 'TRANSACTION_BUILD_FAILED',

  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',

  // 钱包相关错误
  SIGNER_NOT_AVAILABLE = 'SIGNER_NOT_AVAILABLE',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',

  // 支票业务错误
  VOUCHER_ALREADY_REDEEMED = 'VOUCHER_ALREADY_REDEEMED',
  VOUCHER_NOT_FOUND = 'VOUCHER_NOT_FOUND',
  INVALID_VOUCHER_CODE = 'INVALID_VOUCHER_CODE',

  // Merkle 相关错误
  MERKLE_PROOF_FAILED = 'MERKLE_PROOF_FAILED',
  MERKLE_TREE_SYNC_FAILED = 'MERKLE_TREE_SYNC_FAILED',

  // ZK 证明相关错误
  ZK_PROOF_GENERATION_FAILED = 'ZK_PROOF_GENERATION_FAILED',
  ZK_PROOF_VERIFICATION_FAILED = 'ZK_PROOF_VERIFICATION_FAILED',

  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误码到用户友好消息的映射
 */
export const VOUCHER_ERROR_MESSAGES: Record<VoucherErrorCode, string> = {
  // Gas 相关错误
  [VoucherErrorCode.GAS_INSUFFICIENT]: i18n.t('pages.onetransfer.errors.voucherErrors.gasInsufficient'),
  [VoucherErrorCode.GAS_OBJECT_INVALID]: i18n.t('pages.onetransfer.errors.voucherErrors.gasObjectInvalid'),
  [VoucherErrorCode.GAS_EXCEEDS_MAXIMUM]: i18n.t('pages.onetransfer.errors.voucherErrors.gasExceedsMaximum'),

  // 余额相关错误
  [VoucherErrorCode.COIN_BALANCE_INSUFFICIENT]: i18n.t('pages.onetransfer.errors.voucherErrors.coinBalanceInsufficient'),

  // 交易相关错误
  [VoucherErrorCode.TRANSACTION_VALIDATION_FAILED]: i18n.t('pages.onetransfer.errors.voucherErrors.transactionValidationFailed'),
  [VoucherErrorCode.TRANSACTION_BUILD_FAILED]: i18n.t('pages.onetransfer.errors.voucherErrors.transactionBuildFailed'),

  // 网络相关错误
  [VoucherErrorCode.NETWORK_ERROR]: i18n.t('pages.onetransfer.errors.voucherErrors.networkError'),
  [VoucherErrorCode.RPC_ERROR]: i18n.t('pages.onetransfer.errors.voucherErrors.rpcError'),

  // 钱包相关错误
  [VoucherErrorCode.SIGNER_NOT_AVAILABLE]: i18n.t('pages.onetransfer.errors.voucherErrors.signerNotAvailable'),
  [VoucherErrorCode.WALLET_NOT_CONNECTED]: i18n.t('pages.onetransfer.errors.voucherErrors.walletNotConnected'),

  // 支票业务错误
  [VoucherErrorCode.VOUCHER_ALREADY_REDEEMED]: i18n.t('pages.onetransfer.errors.voucherErrors.voucherAlreadyRedeemed'),
  [VoucherErrorCode.VOUCHER_NOT_FOUND]: i18n.t('pages.onetransfer.errors.voucherErrors.voucherNotFound'),
  [VoucherErrorCode.INVALID_VOUCHER_CODE]: i18n.t('pages.onetransfer.errors.voucherErrors.invalidVoucherCode'),

  // Merkle 相关错误
  [VoucherErrorCode.MERKLE_PROOF_FAILED]: i18n.t('pages.onetransfer.errors.voucherErrors.merkleProofFailed'),
  [VoucherErrorCode.MERKLE_TREE_SYNC_FAILED]: i18n.t('pages.onetransfer.errors.voucherErrors.merkleTreeSyncFailed'),

  // ZK 证明相关错误
  [VoucherErrorCode.ZK_PROOF_GENERATION_FAILED]: i18n.t('pages.onetransfer.errors.voucherErrors.zkProofGenerationFailed'),
  [VoucherErrorCode.ZK_PROOF_VERIFICATION_FAILED]: i18n.t('pages.onetransfer.errors.voucherErrors.zkProofVerificationFailed'),

  // 通用错误
  [VoucherErrorCode.UNKNOWN_ERROR]: i18n.t('pages.onetransfer.errors.voucherErrors.unknownError'),
};

export const GAS_PAYMENT_ERROR_KEYWORDS = [
  'no valid gas coins',
  'missing gas payment',
  'no gas coins found',
];

/**
 * 解析错误消息，识别错误类型
 * @param error - 错误对象
 * @returns 错误码
 */
export function parseVoucherError(error: Error): VoucherErrorCode {
  const message = error.message;

  // 检查是否是已定义的错误码（从 client.ts 抛出的）
  if (Object.values(VoucherErrorCode).includes(message as VoucherErrorCode)) {
    return message as VoucherErrorCode;
  }

  // 检查错误消息关键字
  const lowerMessage = message.toLowerCase();

  // Gas 相关错误
  if (
    message.includes('InsufficientGas') ||
    lowerMessage.includes('insufficient gas') ||
    lowerMessage.includes('gasbalancetoolow') ||
    lowerMessage.includes('balance of gas object') ||
    lowerMessage.includes('gas_balance') ||
    lowerMessage.includes('needed_gas_amount') ||
    GAS_PAYMENT_ERROR_KEYWORDS.some((keyword) => lowerMessage.includes(keyword))
  ) {
    return VoucherErrorCode.GAS_INSUFFICIENT;
  }
  if (message.includes('InvalidGasObject') || lowerMessage.includes('invalid gas object')) {
    return VoucherErrorCode.GAS_OBJECT_INVALID;
  }
  if (lowerMessage.includes('gas') && lowerMessage.includes('exceed')) {
    return VoucherErrorCode.GAS_EXCEEDS_MAXIMUM;
  }

  // 余额相关错误
  if (message.includes('InsufficientCoinBalance') || lowerMessage.includes('insufficient balance')) {
    return VoucherErrorCode.COIN_BALANCE_INSUFFICIENT;
  }
  if (lowerMessage.includes('insufficient') && !lowerMessage.includes('gas')) {
    return VoucherErrorCode.COIN_BALANCE_INSUFFICIENT;
  }

  // 网络相关错误
  if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
    return VoucherErrorCode.NETWORK_ERROR;
  }
  if (lowerMessage.includes('rpc') || lowerMessage.includes('endpoint')) {
    return VoucherErrorCode.RPC_ERROR;
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return VoucherErrorCode.NETWORK_ERROR;
  }

  // 钱包相关错误
  if (lowerMessage.includes('signer') || lowerMessage.includes('wallet')) {
    return VoucherErrorCode.SIGNER_NOT_AVAILABLE;
  }
  if (lowerMessage.includes('unlock')) {
    return VoucherErrorCode.SIGNER_NOT_AVAILABLE;
  }

  // 支票业务错误
  if (lowerMessage.includes('already') && lowerMessage.includes('redeem')) {
    return VoucherErrorCode.VOUCHER_ALREADY_REDEEMED;
  }
  if (lowerMessage.includes('not found') && lowerMessage.includes('voucher')) {
    return VoucherErrorCode.VOUCHER_NOT_FOUND;
  }
  if (lowerMessage.includes('invalid') && lowerMessage.includes('voucher')) {
    return VoucherErrorCode.INVALID_VOUCHER_CODE;
  }

  // Merkle 相关错误
  if (lowerMessage.includes('merkle')) {
    return VoucherErrorCode.MERKLE_PROOF_FAILED;
  }
  if (
    lowerMessage.includes('本地承诺数量') ||
    lowerMessage.includes('local commitment count')
  ) {
    return VoucherErrorCode.MERKLE_TREE_SYNC_FAILED;
  }

  // ZK 证明相关错误
  if (lowerMessage.includes('proof') && lowerMessage.includes('generat')) {
    return VoucherErrorCode.ZK_PROOF_GENERATION_FAILED;
  }
  if (lowerMessage.includes('proof') && lowerMessage.includes('verif')) {
    return VoucherErrorCode.ZK_PROOF_VERIFICATION_FAILED;
  }

  // 交易相关错误
  if (lowerMessage.includes('transaction') && lowerMessage.includes('failed')) {
    return VoucherErrorCode.TRANSACTION_VALIDATION_FAILED;
  }
  if (lowerMessage.includes('build') && lowerMessage.includes('failed')) {
    return VoucherErrorCode.TRANSACTION_BUILD_FAILED;
  }

  // 默认返回未知错误
  return VoucherErrorCode.UNKNOWN_ERROR;
}

/**
 * 获取错误的友好消息
 * @param error - 错误对象
 * @returns 友好的错误消息
 */
export function getVoucherErrorMessage(error: Error): string {
  const errorCode = parseVoucherError(error);
  const friendlyMessage = VOUCHER_ERROR_MESSAGES[errorCode];

  // 如果是未知错误且有原始消息，返回原始消息
  if (errorCode === VoucherErrorCode.UNKNOWN_ERROR && error.message) {
    return error.message;
  }

  return friendlyMessage || error.message || '操作失败，请重试';
}

/**
 * 显示支票错误 Toast 通知
 * @param error - 错误对象
 */
export function showVoucherError(error: Error): void {
  const message = getVoucherErrorMessage(error);
  toastError(message);
}

/**
 * 创建支票错误对象
 * @param code - 错误码
 * @param originalError - 原始错误（可选）
 * @returns 错误对象
 */
export function createVoucherError(
  code: VoucherErrorCode,
  originalError?: Error,
): Error {
  const error = new Error(code);
  if (originalError) {
    // 保留原始错误的堆栈信息
    error.stack = originalError.stack;
  }
  return error;
}
