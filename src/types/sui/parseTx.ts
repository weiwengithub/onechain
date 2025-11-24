import type { SuiTransactionBlockResponse } from '@onelabs/sui/client';

export interface StakingTransactionInfo {
  coinType?: string;
  amount: string;
  validatorAddress: string;
  isUnstaking?: boolean;
}

export interface SendTransactionInfo {
  isSender: boolean;
  sender: string;
  recipient: string;
  coinType?: string;
  coinAmount?: string;
  objectId?: string;
  objectType?: string;
}

export interface MoveCallTransactionInfo {
  packageObjectId: string;
  moduleName: string;
  functionName: string;
  possibleDisplayObjectIds?: string[];
}

export interface FaucetTransactionInfo {
  amount: string;
}

export interface BasicTransactionInfo {
  type: string;
  commands?: string[];
}

export interface ImportantTransactionInfo {
  staking?: StakingTransactionInfo[];
  sending?: SendTransactionInfo[];
  moveCalls?: MoveCallTransactionInfo[];
  faucet?: FaucetTransactionInfo;
  basic?: BasicTransactionInfo;
}

// RWA Event Types
export interface DividendBatchSubmitEvent {
  dividend_funds: string;
  rwa_token_total_supply: string;
}

export interface DividendListAddEvent {
  user: string;
  participating_dividend: string;
}

export interface UserDividendFundsClaimEvent {
  amount: string;
  recipient: string;
}

export interface BuyRwaTokenEvent {
  buy_amount: string;
  pay_amount: string;
  price: string;
  project_id: string;
  recipient: string;
  user: string;
}

export interface SuiEvent {
  type?: string;
  parsedJson?: Record<string, any> | DividendBatchSubmitEvent | DividendListAddEvent | UserDividendFundsClaimEvent;
}

export interface AnalyzedTransaction {
  owner: string;
  digest: string;
  timestampMs?: string | null;
  isSender: boolean;
  from?: string;
  totalGasUsed?: string;
  ownerBalanceChanges?: Record<string, string>;
  important: ImportantTransactionInfo;
  status: 'success' | 'failure';
  original: SuiTransactionBlockResponse;
}

export type SuiJsonValue = string | number | boolean | SuiJsonValue[];
