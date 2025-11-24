import type { TronTxBase, TronSignedTx } from '@/types/tron/tx';
import type { ChainType } from '@/types/chain.ts';

// Request Message Types
export interface TronRequestAccount {
  chainType: Extract<ChainType, 'tron'>;
  method: 'tron_requestAccounts';
  params?: never;
}

export interface TronGetAccounts {
  chainType: Extract<ChainType, 'tron'>;
  method: 'tron_accounts';
  params?: never;
}

export interface TronGetNetwork {
  chainType: Extract<ChainType, 'tron'>;
  method: 'tron_chainId';
  params?: never;
}

export interface TronSignTransaction {
  chainType: Extract<ChainType, 'tron'>;
  method: 'tron_signTransaction';
  params: {
    transaction: TronTxBase;
  };
}

export interface TronSignMessage {
  chainType: Extract<ChainType, 'tron'>;
  method: 'tron_signMessage';
  params: {
    message: string;
  };
}

export interface TronSendTransaction {
  chainType: Extract<ChainType, 'tron'>;
  method: 'tron_sendTransaction';
  params: {
    transaction: TronTxBase;
  };
}

export interface TronSwitchNetwork {
  chainType: Extract<ChainType, 'tron'>;
  method: 'wallet_switchTronNetwork';
  params: {
    chainId: string;
  };
}

export interface TronAddNetwork {
  chainType: Extract<ChainType, 'tron'>;
  method: 'wallet_addTronNetwork';
  params: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    };
    blockExplorerUrls?: string[];
  };
}

// Response Message Types
export interface TronAccountsResponse {
  accounts: string[];
}

export interface TronNetworkResponse {
  chainId: string;
  networkId: string;
}

export interface TronSignTransactionResponse {
  signedTransaction: TronSignedTx;
}

export interface TronSignMessageResponse {
  signature: string;
}

export interface TronSendTransactionResponse {
  txid: string;
  result: boolean;
}

// Event Message Types
export interface TronAccountsChangedEvent {
  event: 'accountsChanged';
  data: {
    accounts: string[];
  };
}

export interface TronChainChangedEvent {
  event: 'chainChanged';
  data: {
    chainId: string;
  };
}

export interface TronConnectEvent {
  event: 'connect';
  data: {
    chainId: string;
  };
}

export interface TronDisconnectEvent {
  event: 'disconnect';
  data: Record<string, never>;
}

// Union Types
export type TronRequest =
  | TronRequestAccount
  | TronGetAccounts
  | TronGetNetwork
  | TronSignTransaction
  | TronSignMessage
  | TronSendTransaction
  | TronSwitchNetwork
  | TronAddNetwork;

export type TronResponse =
  | TronAccountsResponse
  | TronNetworkResponse
  | TronSignTransactionResponse
  | TronSignMessageResponse
  | TronSendTransactionResponse;

export type TronEventMessage = TronAccountsChangedEvent | TronChainChangedEvent | TronConnectEvent | TronDisconnectEvent;

// Method Names
export const TRON_METHODS = {
  REQUEST_ACCOUNTS: 'tron_requestAccounts',
  GET_ACCOUNTS: 'tron_accounts',
  GET_NETWORK: 'tron_chainId',
  SIGN_TRANSACTION: 'tron_signTransaction',
  SIGN_MESSAGE: 'tron_signMessage',
  SEND_TRANSACTION: 'tron_sendTransaction',
  SWITCH_NETWORK: 'wallet_switchTronNetwork',
  ADD_NETWORK: 'wallet_addTronNetwork',
} as const;

export type TronMethod = (typeof TRON_METHODS)[keyof typeof TRON_METHODS];

// Events
export const TRON_EVENTS = {
  ACCOUNTS_CHANGED: 'accountsChanged',
  CHAIN_CHANGED: 'chainChanged',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
} as const;

export type TronEvent = (typeof TRON_EVENTS)[keyof typeof TRON_EVENTS];
