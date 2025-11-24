export interface TronTxParameter {
  owner_address: string;
  to_address?: string;
  amount?: number;
  contract_address?: string;
  data?: string;
}

export interface TronContract {
  parameter: {
    value: TronTxParameter;
    type_url: string;
  };
  type: string;
  Permission_id?: number;
}

export interface TronRawData {
  contract: TronContract[];
  ref_block_bytes: string;
  ref_block_hash: string;
  expiration: number;
  timestamp: number;
  fee_limit?: number;
  data?: string;
}

export interface TronTxBase {
  txID?: string;
  visible?: boolean;
  raw_data: TronRawData;
  raw_data_hex: string;
}

export interface TronSignedTx extends TronTxBase {
  signature: string[];
}

export interface TronBroadcastResult {
  result: boolean;
  txid?: string;
  code?: string;
  message?: string;
}

export interface TronTxReceipt {
  txid: string;
  result: string;
  resMessage?: string;
  blockNumber?: number;
  blockTimeStamp?: number;
  energy_usage?: number;
  energy_fee?: number;
  net_usage?: number;
  net_fee?: number;
}

export type TronContractType =
  | 'TransferContract'
  | 'TransferAssetContract'
  | 'TriggerSmartContract'
  | 'FreezeBalanceContract'
  | 'UnfreezeBalanceContract'
  | 'WithdrawBalanceContract'
  | 'VoteWitnessContract'
  | 'CreateSmartContract';

export interface TronTransactionDetail {
  ret: Array<{
    contractRet: string;
    fee?: number;
  }>;
  signature: string[];
  txID: string;
  raw_data: TronRawData;
  raw_data_hex: string;
}

export interface TronPendingTx {
  txID: string;
  raw_data: TronRawData;
  signature?: string[];
  timestamp: number;
}
