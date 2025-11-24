import type { ChainType } from './chain';

export interface AssetId {
  id: string;
  chainId: string;
  chainType: ChainType;
}

export interface AssetBase extends AssetId {
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  image?: string;
  coinGeckoId?: string;
}

export interface EvmAsset extends AssetBase {
  chainType: 'evm';
  type: string;
  category?: number;
}

export interface EvmErc20Asset extends AssetBase {
  chainType: 'evm';
  type: 'erc20';
  category?: number;
  wallet_preload?: boolean;
}

export interface CosmosAsset extends AssetBase {
  chainType: 'cosmos';
  chain: string;
  type: string;
  category?: number;
  ibc_info?: {
    path: string;
    client: {
      channel: string;
      port: string;
    };
    counterparty: {
      channel: string;
      port: string;
      chain: string;
      denom: string;
    };
  };
  bridge_info?: {
    path?: string;
    counterparty?: {
      chain?: string;
      contract?: string;
    };
  };
  color?: string;
}

export interface CosmosCw20Asset extends AssetBase {
  chainType: 'cosmos';
  type: string;
  category?: number;
  wallet_preload?: boolean;
}

export interface SuiAsset extends AssetBase {
  chainType: 'sui';
  type: string;
  category?: number;
}

export interface AptosAsset extends AssetBase {
  chainType: 'aptos';
  type: string;
  category?: number;
}

export interface BitcoinAsset extends AssetBase {
  chainType: 'bitcoin';
  type: string;
  category?: number;
  color?: string;
}

export interface IotaAsset extends AssetBase {
  chainType: 'iota';
  type: string;
  category?: number;
}

export type Asset = CosmosAsset | CosmosCw20Asset | EvmAsset | EvmErc20Asset | SuiAsset | AptosAsset | BitcoinAsset | IotaAsset;

export type AssetSingleGroup = {
  singles: Asset[];
  groups: Record<string, Asset[]>;
};

export interface CustomCosmosAsset extends AssetBase {
  chainType: 'cosmos';
  type: string;
  category?: number;
}

export interface CustomEvmAsset extends AssetBase {
  chainType: 'evm';
  type: string;
}

export type CustomAsset = CustomCosmosAsset | CustomEvmAsset;

export interface CW721AssetsResponse {
  assets: { chain: string; id: number; name: string; contractAddress: string }[];
}
