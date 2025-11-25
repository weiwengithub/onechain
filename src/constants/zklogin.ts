// ZkLogin 支持的网络 ID (目前仅支持 Sui 链)
export const ZKLOGIN_SUPPORTED_CHAIN_ID = 'oct';

// ZkLogin 支持的链类型
export const ZKLOGIN_SUPPORTED_CHAIN_TYPE = 'sui';

// ZkLogin 账户类型配置
export const ZKLOGIN_ACCOUNT_TYPE = {
  hdPath: `m/44'/784'/0'/0'/0'`,
  pubkeyStyle: 'ed25519' as const,
  pubkeyType: null,
  isDefault: null,
} as const;
