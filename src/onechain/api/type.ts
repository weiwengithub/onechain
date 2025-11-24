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

export type RwaProjectDetail = {
  apr?: number;
  attachPics?: string;
  auditBy?: number;
  auditByer?: string;
  auditTime?: string;
  available?: number;
  bankProjectId?: string;
  bossAddress?: string;
  buyEndTime?: string;
  buyEndTimeTimestamp?: number;
  buyStartTime?: string;
  buyStartTimeTimestamp?: number;
  channelCode?: string;
  channelId?: number;
  channelName?: string;
  createTime?: string;
  description?: string;
  expectedApr?: number;
  expectedRaiseFunds?: number;
  fundRaiseProgress?: number;
  icon?: string;
  id?: number;
  idoProjectId?: string;
  investorCount?: number;
  isCompleted?: string;
  isDelete?: boolean;
  issuePrice: number;
  marketPrice?: number;
  minimum?: number;
  packageId?: string;
  payCoinType?: string;
  payTokenAddress?: string;
  payTokenDecimals?: number;
  payTokenSymbol?: string;
  projectContractId?: number;
  projectId?: number;
  projectName?: string;
  projectStatus?: string;
  projectType?: string;
  publishTime?: string;
  rwaCoinType?: string;
  rwaKey?: string;
  rwaProjectId?: string;
  soldSupply?: number;
  sortControl?: number;
  tokenDecimals?: number;
  tokenDescription?: string;
  tokenName?: string;
  tokenSymbol?: string;
  totalSupply?: number;
  txId?: string;
  updateBy?: string;
  updateTime?: string;
};

export type RwaProjectDetailResp = {
  code: number;
  data?: RwaProjectDetail;
  msg: string;
};
