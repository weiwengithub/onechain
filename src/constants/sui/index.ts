export const PERMISSION = {
  VIEW_ACCOUNT: 'viewAccount',
  SUGGEST_TRANSACTIONS: 'suggestTransactions',
} as const;

export const SUI_COIN_TYPE = '0x2::sui::SUI';
export const OCT_COIN_TYPE = '0x2::oct::OCT';

export const SUI_TOKEN_TEMPORARY_DECIMALS = 9;

export const TRANSACTION_RESULT = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

export const SUI_FAUCET_URL = 'https://faucet.testnet.sui.io/v2/gas';
export const OCT_FAUCET_URL = 'https://faucet-testnet.onelabs.cc/gas';
