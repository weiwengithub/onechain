import type { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { createRequestInstance } from '@/onechain/api/request.ts';
import type { RwaProjectDetailResp } from '@/onechain/api/type.ts';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork';

const RWA_API = 'https://onerwa.cc/api/ext';
const RWA_API_TEST = 'https://rwa.deltax.online/api/ext';

class RwaApi {
  reqInstance: AxiosInstance;

  constructor(isTestnet = false) {
    const baseUrl = isTestnet ? RWA_API_TEST : RWA_API;
    this.reqInstance = createRequestInstance(baseUrl, 15000);
  }

  /**
   * Get RWA project detail by package ID (contract address)
   * @param contractAddress - The contract address (first part before :: in coinId)
   * @returns RWA project detail with issuePrice
   */
  async getRwaProjectDetail(contractAddress: string): Promise<RwaProjectDetailResp | undefined> {
    try {
      const res = await this.reqInstance.post(
        `/project/detailByPackageId/${contractAddress}`,
        undefined,
        {
          headers: {
            'channel': 'RWA',
            'content-type': 'application/json',
          },
        },
      );
      // @ts-ignore
      return res;
    } catch (e) {
      console.error('Failed to get RWA project detail:', e);
      return undefined;
    }
  }
}

export const createRwaApi = (isTestnet = false) => new RwaApi(isTestnet);

export const useRwaApi = () => {
  const { currentSuiNetwork } = useCurrentSuiNetwork();
  const isTestnet = currentSuiNetwork?.isTestnet ?? false;

  return useMemo(() => createRwaApi(isTestnet), [isTestnet]);
};

const rwaApi = new RwaApi();
export default rwaApi;
