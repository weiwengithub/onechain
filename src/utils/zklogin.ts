import type { Account } from '@/types/account';
import type { UniqueChainId } from '@/types/chain';
import { ZKLOGIN_SUPPORTED_CHAIN_ID } from '@/constants/zklogin';
import { parseUniqueChainId } from '@/utils/queryParamGenerator';
import { extensionLocalStorage } from './storage';

/**
 * 检查单个账户是否为 ZkLogin 类型
 */
export function isZkLoginAccount(account: Account): boolean {
  return account.type === 'ZKLOGIN';
}

/**
 * 检查当前应用是否有任何 ZkLogin 账户
 */
export async function hasZkLoginAccounts(): Promise<boolean> {
  const { userAccounts } = await extensionLocalStorage();
  return userAccounts.some(account => isZkLoginAccount(account));
}

/**
 * 获取当前账户并检查是否为 ZkLogin 类型
 */
export async function isCurrentAccountZkLogin(): Promise<boolean> {
  const { userAccounts, currentAccountId } = await extensionLocalStorage();
  const currentAccount = userAccounts.find(account => account.id === currentAccountId);
  return currentAccount ? isZkLoginAccount(currentAccount) : false;
}

/**
 * 获取指定账户并检查是否为 ZkLogin 类型
 */
export function isAccountZkLogin(accountId: string, accounts: Account[]): boolean {
  const account = accounts.find(acc => acc.id === accountId);
  return account ? isZkLoginAccount(account) : false;
}

/**
 * 过滤出所有 ZkLogin 账户
 */
export function getZkLoginAccounts(accounts: Account[]): Account[] {
  return accounts.filter(isZkLoginAccount);
}

/**
 * 过滤出所有非 ZkLogin 账户
 */
export function getNonZkLoginAccounts(accounts: Account[]): Account[] {
  return accounts.filter(account => !isZkLoginAccount(account));
}

/**
 * 检查指定的网络 ID 是否为 ZkLogin 支持的网络
 */
export function isSupportedZkLoginChain(chainId: UniqueChainId | null | undefined): boolean {
  if (!chainId) return false;

  const parsed = parseUniqueChainId(chainId);
  return parsed?.id === ZKLOGIN_SUPPORTED_CHAIN_ID;
}

/**
 * 获取 ZkLogin 支持的网络 ID (Sui 类型)
 */
export function getZkLoginSupportedChainId(): UniqueChainId {
  return `${ZKLOGIN_SUPPORTED_CHAIN_ID}__sui` as UniqueChainId;
}

/**
 * 检查当前选中的网络对于指定账户是否有效
 */
export function isValidChainForAccount(account: Account, selectedChainId: UniqueChainId | null): boolean {
  if (isZkLoginAccount(account)) {
    // ZkLogin 账户不支持 "All Network" 状态，必须选择特定网络
    if (!selectedChainId) return false;
    return isSupportedZkLoginChain(selectedChainId);
  }

  // 非 ZkLogin 账户支持所有状态（包括 All Network）
  return true;
}