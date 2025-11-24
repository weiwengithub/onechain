import type { AxiosInstance } from 'axios';
import { createRequestInstance } from './request.ts';
import {
  type MarketPriceResp,
  PAGE_NUM_START,
  type RwaProjectDetailResp,
  type TransferHistoryReq,
  type TransferHistoryResp,
  type TransferInfo,
} from './type.ts';

import sleep from 'sleep-promise';

const ONECHAIN_API = 'https://api.one-wallet.cc/api/ext';

class OneChainApi {
  reqInstance: AxiosInstance;

  constructor() {
    this.reqInstance = createRequestInstance(ONECHAIN_API, 15000);
  }

  async getTransferHistoryByTxId(txId: string): Promise<TransferInfo | undefined> {
    try {
      const res: TransferHistoryResp = await this.reqInstance.post(
        `/transaction/list?pageNum=0&pageSize=10&orderByColumn=timestampMs&orderDirection=desc`,
        { txId },
      );
      return res.data?.rows[0];
    } catch (e) {
      console.error(e);
    }
  }

  async getTransferHistory(params: TransferHistoryReq): Promise<TransferHistoryResp | undefined> {
    const {
      txId,
      fromAddress,
      toAddress,
      searchAddress,
      pageNum = PAGE_NUM_START,
      pageSize = 100,
      orderDirection = 'desc',
      orderByColumn = 'timestampMs',
    } = params;

    try {
      return await this.reqInstance.post(
        `/transaction/list`,
        {
          txId,
          fromAddress,
          toAddress,
          searchAddress,
        },
        {
          params: {
            pageNum,
            pageSize,
            orderDirection,
            orderByColumn,
          },
        },
      );
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  async getMarketPrice(): Promise<MarketPriceResp | undefined> {
    try {
      return await this.reqInstance.post(`/marketPrice/list`, {});
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }

  async getAllTransferHistory(params: TransferHistoryReq): Promise<TransferInfo[]> {
    const { pageNum, ...rest } = params;

    const txInfo: TransferInfo[] = [];
    let haveGetOnce = false; //是否已经请求过数据
    let totalCount = 0;
    let currPageNum = pageNum ?? PAGE_NUM_START;

    while (!haveGetOnce || txInfo.length < totalCount) {
      if (haveGetOnce) {
        await sleep(100);
      }
      const newReq: TransferHistoryReq = { pageNum: currPageNum, ...rest };
      const res = await this.getTransferHistory(newReq);
      if (res?.success && res.data) {
        totalCount = res.data.count;
        txInfo.push(...res.data.rows);
        currPageNum += 1;
      }
      haveGetOnce = true;
    }

    return txInfo;
  }
}

const oneChainApi = new OneChainApi();
export default oneChainApi;
