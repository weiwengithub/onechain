import { TRON_CONSTANTS } from './common';

// Fee Configuration
export const TRON_FEE_CONFIG = {
  // Default fee limit for smart contract calls (in SUN)
  DEFAULT_FEE_LIMIT: TRON_CONSTANTS.DEFAULT_FEE_LIMIT,

  // Minimum fee limit
  MIN_FEE_LIMIT: 0,

  // Maximum fee limit
  MAX_FEE_LIMIT: 1_000_000_000, // 1000 TRX in SUN

  // TRC20 transfer fee limit
  TRC20_TRANSFER_FEE_LIMIT: 50_000_000, // 50 TRX in SUN

  // TRC20 approve fee limit
  TRC20_APPROVE_FEE_LIMIT: 50_000_000, // 50 TRX in SUN

  // Native TRX transfer (no fee limit needed, uses bandwidth)
  TRX_TRANSFER_BANDWIDTH: 270, // bytes

  // Account creation fee
  ACCOUNT_CREATION_FEE: TRON_CONSTANTS.CREATE_ACCOUNT_FEE,
} as const;

// Resource Types
export const TRON_RESOURCE_TYPE = {
  BANDWIDTH: 'BANDWIDTH',
  ENERGY: 'ENERGY',
} as const;

export type TronResourceType = (typeof TRON_RESOURCE_TYPE)[keyof typeof TRON_RESOURCE_TYPE];

// Resource Prices
export const TRON_RESOURCE_PRICE = {
  // Bandwidth price in SUN per byte
  BANDWIDTH: TRON_CONSTANTS.BANDWIDTH_PRICE,

  // Energy price in SUN per unit
  ENERGY: TRON_CONSTANTS.ENERGY_PRICE,
} as const;

// Free Resource Limits
export const TRON_FREE_RESOURCE = {
  // Free bandwidth limit per account
  FREE_NET_LIMIT: TRON_CONSTANTS.FREE_NET_LIMIT,

  // No free energy for contracts
  FREE_ENERGY_LIMIT: 0,
} as const;

// Gas Estimation Multipliers
export const TRON_GAS_MULTIPLIER = {
  // Multiplier for safe gas estimation
  SAFE: 1.2,

  // Multiplier for fast transaction
  FAST: 1.5,

  // Standard multiplier
  STANDARD: 1.0,
} as const;

// Transaction Size Limits
export const TRON_TX_SIZE_LIMIT = {
  // Maximum transaction size in bytes
  MAX_TX_SIZE: 5000,

  // Typical TRX transfer size
  TRX_TRANSFER_SIZE: 270,

  // Typical TRC20 transfer size
  TRC20_TRANSFER_SIZE: 345,
} as const;

// Energy Costs for Common Operations
export const TRON_ENERGY_COST = {
  // TRC20 transfer energy cost (approximate)
  TRC20_TRANSFER: 31_895,

  // TRC20 approve energy cost (approximate)
  TRC20_APPROVE: 31_895,

  // Contract deployment (varies widely)
  CONTRACT_DEPLOYMENT_BASE: 100_000,
} as const;

// Fee Tiers for UI
export const TRON_FEE_TIER = {
  SLOW: {
    label: 'Slow',
    multiplier: TRON_GAS_MULTIPLIER.STANDARD,
    feeLimit: TRON_FEE_CONFIG.DEFAULT_FEE_LIMIT,
  },
  NORMAL: {
    label: 'Normal',
    multiplier: TRON_GAS_MULTIPLIER.SAFE,
    feeLimit: TRON_FEE_CONFIG.DEFAULT_FEE_LIMIT * 1.2,
  },
  FAST: {
    label: 'Fast',
    multiplier: TRON_GAS_MULTIPLIER.FAST,
    feeLimit: TRON_FEE_CONFIG.DEFAULT_FEE_LIMIT * 1.5,
  },
} as const;

export type TronFeeTier = keyof typeof TRON_FEE_TIER;
