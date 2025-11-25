export interface TronAccountBalance {
  balance: number; // in SUN (1 TRX = 1,000,000 SUN)
  address: string;
}

export interface TronTokenBalance {
  tokenId: string;
  tokenAbbr: string;
  tokenName: string;
  tokenDecimal: number;
  tokenCanShow: number;
  tokenType: string;
  tokenLogo: string;
  vip: boolean;
  tokenPriceInTrx: number;
  amount: string;
  balance: string;
  nrOfTokenHolders: number;
  transferCount: number;
}

export interface TronTrc20Balance {
  contract_address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

export interface TronAccountResource {
  freeNetLimit: number;
  freeNetUsed: number;
  NetLimit: number;
  NetUsed: number;
  EnergyLimit: number;
  EnergyUsed: number;
  assetNetUsed?: {
    key: string;
    value: number;
  }[];
  assetNetLimit?: {
    key: string;
    value: number;
  }[];
  TotalNetLimit: number;
  TotalNetWeight: number;
  TotalEnergyLimit: number;
  TotalEnergyWeight: number;
}

export interface TronGetBalance {
  coinType: string;
  totalBalance: string;
}
