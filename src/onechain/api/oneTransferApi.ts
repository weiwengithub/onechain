import type { AxiosInstance } from 'axios';
import { createRequestInstance } from '@/onechain/api/request.ts';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork';
import { useMemo } from 'react';

export interface ProofRequest {
  // 按照参考请求顺序排列：refund, nullifier, root, nullifier_hash, secret, path_indices, recipient, path_elements
  // 注意：后端服务器期望数字类型，而不是字符串！
  refund: number;         // u64 整数，如 1000000000
  nullifier: string;      // 字符串格式的大整数
  root: string;           // 字符串格式的大整数  
  nullifier_hash: string; // 字符串格式的大整数
  secret: string;         // 字符串格式的大整数
  path_indices: number[]; // 数字数组，0/1 表示路径方向
  recipient: string;      // 字符串格式的大整数（地址转换）
  path_elements: string[]; // 字符串数组，每个元素是大整数
}

export interface ProofResponse {
  proof: string;
  public_inputs: string;
}

/**
 * Commitment 列表请求参数
 * 用于从后端索引器获取指定 leafIndex 的 commitment 列表
 */
export interface CommitmentListRequest {
  leaf_index: number;      // 目标叶子索引
  package_addr: string;    // 合约包地址
}

/**
 * Commitment 项
 * 对应实际 API 返回的数据结构
 */
export interface CommitmentItem {
  commitment: string;      // commitment 值（数字字符串）
  leaf_index: number;      // 叶子索引（数字类型）
  timestamp: number;       // 时间戳（毫秒）
  tx_digest: string;       // 交易哈希
}

/**
 * Commitment 列表响应
 * 对应实际 API 返回的完整数据结构
 */
export interface CommitmentListResponse {
  success: boolean;
  data: {
    commitments: CommitmentItem[];
    height: number;          // Merkle 树高度
    last_leaf_index: number; // 最后一个叶子索引
  };
}

export const OneTransfer_API = 'https://wallet-api.deltax.online';
export const OneTransfer_API_TEST = 'https://wallet-api.deltax.online';

class OneTransferApi {
  reqInstance: AxiosInstance;

  constructor(isTestnet = false) {
    const baseUrl = isTestnet ? OneTransfer_API_TEST : OneTransfer_API;
    // 增加超时时间到60秒，因为ZK证明生成通常需要10-30秒
    this.reqInstance = createRequestInstance(baseUrl, 60000);
  }

  async getVerifyingKey(): Promise<string> {
    try {
      const response = await this.reqInstance.get('/circom/verifying/key');
      return response.data?.data?.verifying_key || '';
    } catch (error) {
      console.error('Error fetching verifying key:', error);
      throw error;
    }
  }

  async getProof(params: ProofRequest): Promise<ProofResponse> {
    try {
      const response = await this.reqInstance.post('/circom/proof/generate', params);
      const { proof, public_inputs } = response.data?.data || {};

      if (!proof || !public_inputs) {
        throw new Error('Invalid response format: missing proof or public_inputs');
      }

      return { proof, public_inputs };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw error;
    }
  }

  async getWithdrawProof(params: ProofRequest): Promise<ProofResponse> {
    try {
      // 为 withdraw 创建单独的实例，超时时间120秒（零知识证明生成可能需要较长时间）
      const baseUrl = this.reqInstance.defaults.baseURL || OneTransfer_API;
      const withdrawInstance = createRequestInstance(baseUrl, 120000);

      const response = await withdrawInstance.post('/circom/proof/generate', params);

      // 修复：响应拦截器已经返回了 response.data，这里直接访问 .data
      const { proof, public_inputs } = response.data || {};

      if (!proof || !public_inputs) {
        throw new Error('Invalid response format: missing proof or public_inputs');
      }

      return { proof, public_inputs };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw error;
    }
  }

  /**
   * 获取 Commitment 列表（从后端索引器）
   *
   * 根据 privacy-sui 最新版本（commit 20a931be）实现
   * 用于从后端索引器获取指定 leafIndex 及之前的所有 commitments
   *
   * @param params - 请求参数 { leaf_index, package_addr }
   * @returns Commitment 列表响应
   *
   * @example
   * ```typescript
   * const response = await api.fetchCommitmentList({
   *   leaf_index: 42,
   *   package_addr: '0x123...'
   * });
   * // 返回: { success: true, data: { commitments: [...] } }
   * ```
   */
  // async fetchCommitmentList(params: CommitmentListRequest): Promise<CommitmentListResponse> {
  //   try {
  //     console.log('📡 调用后端索引器获取 commitments...', params);
  //
  //     const response = await this.reqInstance.post('/commitment/list', params);
  //
  //     debugger;
  //     // 响应拦截器已经返回了 response.data
  //     const data = response.data || response;
  //
  //     if (!data || typeof data.success !== 'boolean') {
  //       throw new Error('Invalid response format from commitment indexer');
  //     }
  //
  //     if (!data.success) {
  //       throw new Error('Commitment indexer returned success: false');
  //     }
  //
  //     if (!data.data || !Array.isArray(data.data.commitments)) {
  //       throw new Error('Invalid commitments data structure');
  //     }
  //
  //     console.log(`✅ 成功获取 ${data.data.commitments.length} 个 commitments`);
  //
  //     return data as CommitmentListResponse;
  //   } catch (error: any) {
  //     console.error('❌ 获取 commitment 列表失败:', error);
  //
  //     // 提供友好的错误提示
  //     if (error.message?.includes('timeout') || error.message?.includes('ECONNABORTED')) {
  //       throw new Error('索引器请求超时：请检查网络连接或稍后重试');
  //     } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
  //       throw new Error('网络错误：无法连接到索引器服务');
  //     } else if (error.message?.includes('404')) {
  //       throw new Error('索引器接口不存在：请确认后端版本是否支持 /commitment/list');
  //     } else if (error.message?.includes('500')) {
  //       throw new Error('索引器服务错误：请稍后重试');
  //     } else {
  //       throw new Error(`获取 commitment 列表失败: ${error.message || '未知错误'}`);
  //     }
  //   }
  // }

  async fetchCommitmentList(params: CommitmentListRequest): Promise<CommitmentListResponse> {
    console.log('📡 正在从索引器获取 commitments...', params);

    try {
      // @ts-ignore
      const res: CommitmentListResponse = await this.reqInstance.post<CommitmentListResponse>('/commitment/list', params);

      // 验证响应结构
      if (!res || !res.success) {
        throw new Error('索引器返回 success: false');
      }

      if (!res.data || !Array.isArray(res.data.commitments)) {
        throw new Error('Invalid commitments data structure');
      }

      console.log(
        `✅ 成功获取 ${res.data.commitments.length} 个 commitments ` +
        `(树高度: ${res.data.height}, 最后索引: ${res.data.last_leaf_index})`,
      );

      return res; // 返回完整响应

    } catch (err) {
      const message = (err as Error).message || '';

      console.error('❌ 获取 commitment 列表失败:', err);

      let friendlyMsg: string;
      if (/timeout|ECONNABORTED/i.test(message)) {
        friendlyMsg = '索引器请求超时：请检查网络连接或稍后重试';
      } else if (/Network|fetch/i.test(message)) {
        friendlyMsg = '网络错误：无法连接到索引器服务';
      } else if (/404/.test(message)) {
        friendlyMsg = '索引器接口不存在：请确认后端版本是否支持 /commitment/list';
      } else if (/500/.test(message)) {
        friendlyMsg = '索引器服务错误：请稍后重试';
      } else {
        friendlyMsg = `获取 commitment 列表失败：${message || '未知错误'}`;
      }

      throw new Error(friendlyMsg);
    }
  }


}

export const createOneTransferApi = (isTestnet = false) => new OneTransferApi(isTestnet);

export const useOneTransferApi = () => {
  const { currentSuiNetwork } = useCurrentSuiNetwork();
  const isTestnet = currentSuiNetwork?.isTestnet ?? false;

  return useMemo(() => createOneTransferApi(isTestnet), [isTestnet]);
};

export const OneTransferApiClass = OneTransferApi;

const oneTransferApi = new OneTransferApi();
export default oneTransferApi;
