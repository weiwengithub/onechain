export interface TronRpc<T> {
  jsonrpc?: '2.0';
  id?: number;
  result?: T;
  error?: TronRpcError;
}

export interface TronRpcError {
  code: number;
  message: string;
}

// Account Info
export interface TronAccountInfo {
  address: string;
  balance: number;
  create_time: number;
  latest_opration_time?: number;
  latest_consume_time?: number;
  latest_consume_free_time?: number;
  account_resource?: {
    frozen_balance_for_energy?: {
      frozen_balance: number;
      expire_time: number;
    };
    energy_usage?: number;
    net_usage?: number;
    frozen_balance_for_net?: {
      frozen_balance: number;
      expire_time: number;
    };
  };
  assetV2?: Array<{
    key: string;
    value: number;
  }>;
  free_asset_net_usageV2?: Array<{
    key: string;
    value: number;
  }>;
}

// Balance Response
export interface TronBalanceResponse {
  balance: number;
}

// Transaction Info
export interface TronTransactionInfo {
  id: string;
  blockNumber: number;
  blockTimeStamp: number;
  contractResult?: string[];
  contract_address?: string;
  receipt: {
    energy_usage: number;
    energy_fee: number;
    origin_energy_usage: number;
    energy_usage_total: number;
    net_usage: number;
    net_fee: number;
    result: string;
  };
  log?: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  result?: string;
  resMessage?: string;
}

// Block Info
export interface TronBlockInfo {
  blockID: string;
  block_header: {
    raw_data: {
      number: number;
      txTrieRoot: string;
      witness_address: string;
      parentHash: string;
      version: number;
      timestamp: number;
    };
    witness_signature: string;
  };
  transactions?: TronTransaction[];
}

// Transaction
export interface TronTransaction {
  txID: string;
  visible?: boolean;
  raw_data: {
    contract: Array<{
      parameter: {
        value: {
          amount?: number;
          owner_address: string;
          to_address?: string;
          contract_address?: string;
          data?: string;
        };
        type_url: string;
      };
      type: string;
    }>;
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number;
    timestamp: number;
    fee_limit?: number;
  };
  raw_data_hex: string;
  signature?: string[];
}

// Chain Parameters
export interface TronChainParameters {
  chainParameter: Array<{
    key: string;
    value: number;
  }>;
}

// Node Info
export interface TronNodeInfo {
  activeConnectCount: number;
  beginSyncNum: number;
  block: string;
  cheatWitnessInfoMap: Record<string, unknown>;
  configNodeInfo: {
    activeNodeSize: number;
    allowAdaptiveEnergy: number;
    allowCreationOfContracts: number;
    backupListenPort: number;
    backupMemberSize: number;
    backupPriority: number;
    codeVersion: string;
    dbVersion: number;
    discoverEnable: boolean;
    listenPort: number;
    maxConnectCount: number;
    maxTimeRatio: number;
    minParticipationRate: number;
    minTimeRatio: number;
    p2pVersion: string;
    passiveNodeSize: number;
    sameIpMaxConnectCount: number;
    sendNodeSize: number;
    supportConstant: boolean;
    versionName: string;
    versionNum: string;
  };
  currentConnectCount: number;
  machineInfo: {
    cpuCount: number;
    cpuRate: number;
    deadLockThreadCount: number;
    deadLockThreadInfoList: Array<unknown>;
    freeMemory: number;
    javaVersion: string;
    jvmFreeMemory: number;
    jvmTotalMemory: number;
    memoryDescInfoList: Array<{
      initSize: number;
      maxSize: number;
      name: string;
      useRate: number;
      useSize: number;
    }>;
    osName: string;
    processCpuRate: number;
    threadCount: number;
    totalMemory: number;
  };
  passiveConnectCount: number;
  peerList: Array<{
    active: boolean;
    avgLatency: number;
    blockInPorcSize: number;
    connectTime: number;
    disconnectTimes: number;
    headBlockTimeWeBothHave: number;
    headBlockWeBothHave: string;
    host: string;
    inFlow: number;
    lastBlockUpdateTime: number;
    lastSyncBlock: string;
    localDisconnectReason: string;
    needSyncFromPeer: boolean;
    needSyncFromUs: boolean;
    nodeCount: number;
    nodeId: string;
    port: number;
    remainNum: number;
    remoteDisconnectReason: string;
    score: number;
    syncBlockRequestedSize: number;
    syncFlag: boolean;
    syncToFetchSize: number;
    syncToFetchSizePeekNum: number;
    unFetchSynNum: number;
  }>;
  solidityBlock: string;
  totalFlow: number;
}

// TRC20 Contract
export interface TronTrc20Contract {
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}
