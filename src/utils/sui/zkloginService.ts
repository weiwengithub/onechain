import { SuiClient } from '@onelabs/sui/client';
import axios from 'axios';
import type { getZkLoginSignature } from '@mysten/sui/zklogin';
import { ZKLOGIN_SUPPORTED_CHAIN_ID } from '@/constants/zklogin.ts';
import type { ZkloginProvider } from '@/types/account.ts';

export const RPC_URL: Record<string, string> = {
  'oct': 'https://rpc-mainnet.onelabs.cc:443',
  'oct-testnet': 'https://rpc-testnet.onelabs.cc:443',
};

export const DELTAX_SALT_API_URL = 'https://salt.onerwa.cc/api/userSalt';
export const OCT_PROVER_DEV_ENDPOINT_DELTAX = 'https://zkprover.onerwa.cc/v1';

const suiClient = new SuiClient({ url: RPC_URL[ZKLOGIN_SUPPORTED_CHAIN_ID] });

export type PartialZkLoginSignature = Omit<
  Parameters<typeof getZkLoginSignature>['0']['inputs'],
  'addressSeed'
>;

export class ZkLoginService {
  private static instance: ZkLoginService | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ZkLoginService {
    if (!ZkLoginService.instance) {
      ZkLoginService.instance = new ZkLoginService();
    }
    return ZkLoginService.instance;
  }

  private initialize(): void {
    console.log('ZkLoginService: Initializing zklogin service...');
  }

  async getEpoch() {
    const { epoch } = await suiClient.getLatestSuiSystemState();
    return epoch;
  };

  async getUserSalt(jwt: string, provider: ZkloginProvider) {
    try {
      const response = await axios.post(`${DELTAX_SALT_API_URL}/${provider}`, {
        jwt,
      });
      const userSalt = response.data.data.salt;
      return userSalt as string;

    } catch (e) {
      console.error(e);
      return undefined;
    }
  };

  async getZkProof(
    idToken: string,
    userSalt: string,
    extendedEphemeralPublicKey: string,
    maxEpoch: number,
    randomness: string,
  ) {
    try {
      const zkProofResult = await axios.post(
        OCT_PROVER_DEV_ENDPOINT_DELTAX,
        {
          jwt: idToken,
          extendedEphemeralPublicKey,
          maxEpoch,
          jwtRandomness: randomness,
          salt: userSalt,
          keyClaimName: 'sub',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      return zkProofResult.data as PartialZkLoginSignature;

    } catch (e) {
      console.error(e);
      return undefined;
    }
  };


}

// 导出单例实例
export const zkLoginService = ZkLoginService.getInstance();
