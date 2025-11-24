// TRON JSON-RPC Methods
export const TRON_RPC_METHOD = {
  // Account Methods
  GET_ACCOUNT: 'wallet/getaccount',
  GET_ACCOUNT_BALANCE: 'wallet/getaccountbalance',
  GET_ACCOUNT_RESOURCE: 'wallet/getaccountresource',

  // Transaction Methods
  CREATE_TRANSACTION: 'wallet/createtransaction',
  TRIGGER_SMART_CONTRACT: 'wallet/triggersmartcontract',
  TRIGGER_CONSTANT_CONTRACT: 'wallet/triggerconstantcontract',
  BROADCAST_TRANSACTION: 'wallet/broadcasttransaction',
  GET_TRANSACTION_BY_ID: 'wallet/gettransactionbyid',
  GET_TRANSACTION_INFO_BY_ID: 'wallet/gettransactioninfobyid',

  // Block Methods
  GET_NOW_BLOCK: 'wallet/getnowblock',
  GET_BLOCK_BY_NUM: 'wallet/getblockbynum',
  GET_BLOCK_BY_ID: 'wallet/getblockbyid',
  GET_BLOCK_BY_LATEST_NUM: 'wallet/getblockbylatestnum',

  // Chain Methods
  GET_CHAIN_PARAMETERS: 'wallet/getchainparameters',
  GET_NODE_INFO: 'wallet/getnodeinfo',

  // Contract Methods
  GET_CONTRACT: 'wallet/getcontract',
  GET_CONTRACT_INFO: 'wallet/getcontractinfo',

  // Asset Methods
  GET_ASSET_ISSUE_BY_ID: 'wallet/getassetissuebyid',
  GET_ASSET_ISSUE_BY_NAME: 'wallet/getassetissuebyname',
  GET_ASSET_ISSUE_LIST: 'wallet/getassetissuelist',

  // TRC10 Token Methods
  TRANSFER_ASSET: 'wallet/transferasset',

  // Energy & Bandwidth
  GET_BANDWIDTH: 'wallet/getaccountnet',

  // List Methods
  LIST_NODES: 'wallet/listnodes',
  LIST_WITNESSES: 'wallet/listwitnesses',

  // Delegation Methods
  FREEZE_BALANCE: 'wallet/freezebalance',
  UNFREEZE_BALANCE: 'wallet/unfreezebalance',
  FREEZE_BALANCE_V2: 'wallet/freezebalancev2',
  UNFREEZE_BALANCE_V2: 'wallet/unfreezebalancev2',
  DELEGATE_RESOURCE: 'wallet/delegateresource',
  UNDELEGATE_RESOURCE: 'wallet/undelegateresource',

  // Staking Methods
  WITHDRAW_BALANCE: 'wallet/withdrawbalance',
  GET_DELEGATED_RESOURCE: 'wallet/getdelegatedresource',
  GET_DELEGATED_RESOURCE_V2: 'wallet/getdelegatedresourcev2',
  GET_DELEGATED_RESOURCE_ACCOUNT_INDEX: 'wallet/getdelegatedresourceaccountindex',
  GET_DELEGATED_RESOURCE_ACCOUNT_INDEX_V2: 'wallet/getdelegatedresourceaccountindexv2',
  GET_CAN_DELEGATED_MAX_SIZE: 'wallet/getcandelegatedmaxsize',
  GET_AVAILABLE_UNFREEZE_COUNT: 'wallet/getavailableunfreezecount',
  GET_CAN_WITHDRAW_UNFREEZE_AMOUNT: 'wallet/getcanwithdrawunfreezeamount',
} as const;

export type TronRpcMethod = (typeof TRON_RPC_METHOD)[keyof typeof TRON_RPC_METHOD];

// TRON Event Methods (for TronWeb)
export const TRON_EVENT_METHOD = {
  ACCOUNTS_CHANGED: 'accountsChanged',
  CHAIN_CHANGED: 'chainChanged',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
} as const;

// TRC20 Function Signatures
export const TRC20_FUNCTION_SIGNATURE = {
  TRANSFER: 'transfer(address,uint256)',
  TRANSFER_FROM: 'transferFrom(address,address,uint256)',
  APPROVE: 'approve(address,uint256)',
  BALANCE_OF: 'balanceOf(address)',
  ALLOWANCE: 'allowance(address,address)',
  NAME: 'name()',
  SYMBOL: 'symbol()',
  DECIMALS: 'decimals()',
  TOTAL_SUPPLY: 'totalSupply()',
} as const;

// TRC20 Method IDs (first 4 bytes of keccak256 hash)
export const TRC20_METHOD_ID = {
  TRANSFER: 'a9059cbb',
  TRANSFER_FROM: '23b872dd',
  APPROVE: '095ea7b3',
  BALANCE_OF: '70a08231',
  ALLOWANCE: 'dd62ed3e',
  NAME: '06fdde03',
  SYMBOL: '95d89b41',
  DECIMALS: '313ce567',
  TOTAL_SUPPLY: '18160ddd',
} as const;
