import type { ChainEndpoint } from '@/types/chain';

// TRON Network IDs
export const TRON_NETWORK_ID = {
  MAINNET: 'tron-mainnet',
  SHASTA: 'tron-shasta',
  NILE: 'tron-nile',
} as const;

export type TronNetworkId = (typeof TRON_NETWORK_ID)[keyof typeof TRON_NETWORK_ID];

// TRON Network Configurations
export const TRON_MAINNET_RPC: ChainEndpoint[] = [
  {
    provider: 'TronGrid',
    url: 'https://api.trongrid.io',
  },
  {
    provider: 'TronStack',
    url: 'https://api.tronstack.io',
  },
  {
    provider: 'Tron Foundation',
    url: 'https://api.tron.network',
  },
];

export const TRON_SHASTA_RPC: ChainEndpoint[] = [
  {
    provider: 'Shasta Testnet',
    url: 'https://api.shasta.trongrid.io',
  },
];

export const TRON_NILE_RPC: ChainEndpoint[] = [
  {
    provider: 'Nile Testnet',
    url: 'https://nile.trongrid.io',
  },
  {
    provider: 'Nileex',
    url: 'https://api.nileex.io',
  },
];

// TRON Chain IDs (hex format)
export const TRON_CHAIN_ID = {
  MAINNET: '0x2b6653dc',
  SHASTA: '0x94a9059e',
  NILE: '0xcd8690dc',
} as const;

// TRON Explorers
export const TRON_EXPLORER = {
  MAINNET: {
    name: 'Tronscan',
    url: 'https://tronscan.org',
    account: 'https://tronscan.org/#/address/',
    tx: 'https://tronscan.org/#/transaction/',
    proposal: 'https://tronscan.org/#/proposal/',
  },
  SHASTA: {
    name: 'Shasta Tronscan',
    url: 'https://shasta.tronscan.org',
    account: 'https://shasta.tronscan.org/#/address/',
    tx: 'https://shasta.tronscan.org/#/transaction/',
    proposal: 'https://shasta.tronscan.org/#/proposal/',
  },
  NILE: {
    name: 'Nile Tronscan',
    url: 'https://nile.tronscan.org',
    account: 'https://nile.tronscan.org/#/address/',
    tx: 'https://nile.tronscan.org/#/transaction/',
    proposal: 'https://nile.tronscan.org/#/proposal/',
  },
} as const;

// TRON Address Prefixes
export const TRON_ADDRESS_PREFIX = {
  MAINNET: 0x41,
  TESTNET: 0xa0,
} as const;

// TRON Constants
export const TRON_CONSTANTS = {
  SUN_PER_TRX: 1_000_000, // 1 TRX = 1,000,000 SUN
  BANDWIDTH_PRICE: 1000, // SUN per byte
  ENERGY_PRICE: 420, // SUN per unit
  CREATE_ACCOUNT_FEE: 1_000_000, // 1 TRX in SUN
  FREE_NET_LIMIT: 1500, // Free bandwidth limit
  DEFAULT_FEE_LIMIT: 150_000_000, // 150 TRX in SUN
  TRANSACTION_EXPIRATION: 60 * 1000, // 60 seconds
} as const;

// HD Path
export const TRON_HD_PATH = "m/44'/195'/0'/0/0";

// TRC20 USDT Contract Address (Mainnet)
export const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// TRC20 USDC Contract Address (Mainnet)
export const TRON_USDC_CONTRACT = 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8';
