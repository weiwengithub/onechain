export const PAGE_NUM_START = 1;

export type PageOptions = {
  pageNum?: number;
  pageSize?: number;
  orderByColumn?: string;
  orderDirection?: string;
};

export type TransferInfo = {
  id?: number;
  txId: string;
  status?: number;
  timestampMs: number;
  type?: string;
  fromAddress: string;
  toAddress: string;
  amount?: number;
  fee?: number;
  blockNum?: number;
  currency?: string;
  contractAddress?: string | null;
};

export type TransferHistoryReq = {
  txId?: string;
  fromAddress?: string;
  toAddress?: string;
  searchAddress?: string;
} & PageOptions;

export type TransferHistoryResp = {
  code: number;
  message: string;
  data?: {
    count: number;
    rows: TransferInfo[];
  };
  success: boolean;
};

export type MarketPriceInfo = {
  circulatingSupply?: string;
  gasAvg?: string;
  marketAddress?: string;
  marketCap?: string;
  price?: string;
  pricePercent?: string;
  supply?: string;
  supplyUsd?: string;
  ttotalStakedAmount?: string;
  ttotalStakedUsdAmount?: string;
  contractAddress?: string;
  percentChange24h?: string;
  octPrice?: number;
  octPricePercent?: number;
};

export type MarketPriceResp = {
  code: number;
  message: string;
  data?: MarketPriceInfo[];
  success: boolean;
};
