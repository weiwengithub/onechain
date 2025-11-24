/**
 * useVoucherSigner Hook
 * 获取支票操作所需的签名器
 */

import { useMemo } from 'react';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Ed25519Keypair as MyStenEd25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { genAddressSeed } from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';
import { getKeypair } from '@/libs/address';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { getFilteredChainsByChainId } from '@/utils/asset';
import { aesDecrypt } from '@/utils/crypto';
import type { SuiChain } from '@/types/chain';
import type { VoucherSigningContext, VoucherZkLoginContext } from '@/types/voucher';
import type { ZkLoginAccount } from '@/types/account';
import type { IdTokenPayload } from '@/hooks/useZklogin';

export interface UseVoucherSignerResult {
  signer: Ed25519Keypair | MyStenEd25519Keypair | null;
  isOct: boolean;
  chainId: string;
  error: string | null;
  signerType: 'standard' | 'zklogin' | null;
  signingContext: VoucherSigningContext | null;
}

function buildZkLoginContext(account: ZkLoginAccount, password: string): {
  signer: MyStenEd25519Keypair;
  context: VoucherZkLoginContext;
} {
  const ephemeralKeySecret = aesDecrypt(account.encryptedEphemeralKey, password);
  const signer = MyStenEd25519Keypair.fromSecretKey(ephemeralKeySecret);

  const idToken = aesDecrypt(account.encryptedIdToken, password);
  const userSalt = aesDecrypt(account.encryptedUserSalt, password);
  const zkProofJson = aesDecrypt(account.encryptedZkProof, password);

  if (!idToken || !userSalt || !zkProofJson) {
    throw new Error('Incomplete zkLogin credentials. Please reauthenticate.');
  }

  const partialZkLoginSignature = JSON.parse(zkProofJson) as VoucherZkLoginContext['partialZkLoginSignature'];
  const decodedJwt = jwtDecode<IdTokenPayload>(idToken);
  if (!decodedJwt?.sub || !decodedJwt?.aud) {
    throw new Error('Invalid zkLogin token payload');
  }

  const addressSeed = genAddressSeed(
    BigInt(userSalt),
    'sub',
    decodedJwt.sub,
    decodedJwt.aud as string,
  ).toString();

  return {
    signer,
    context: {
      partialZkLoginSignature,
      addressSeed,
      maxEpoch: account.maxEpoch,
      userAddress: account.address,
    },
  };
}

export function useVoucherSigner(): UseVoucherSignerResult {
  const { currentAccount } = useCurrentAccount();
  const { currentPassword } = useCurrentPassword();
  const { selectedChainFilterId } = useExtensionStorageStore();
  const { data: accountAllAssets } = useAccountAllAssets();

  const result = useMemo(() => {
    try {
      // 判断当前网络
      const getChainId = (filterId?: string | null): string => {
        if (!filterId) return 'oct';

        return filterId.startsWith('oct-testnet')
          ? 'oct-testnet'
          : filterId.startsWith('sui-testnet')
            ? 'sui-testnet'
            : filterId.startsWith('oct__')
              ? 'oct'
              : filterId.startsWith('sui__')
                ? 'sui'
                : 'oct';
      };

      const chainId = getChainId(selectedChainFilterId);
      const isOct = chainId.startsWith('oct');

      // 检查密码
      if (!currentPassword || !currentAccount) {
        return {
          signer: null,
          isOct,
          chainId,
          error: 'Password required. Please unlock wallet.',
          signerType: null,
          signingContext: null,
        };
      }

      // 从 accountAllAssets 中获取链信息
      const allChains = getFilteredChainsByChainId(accountAllAssets?.flatAccountAssets);
      const suiChains = allChains.filter((c) => c.chainType === 'sui') as SuiChain[];
      const chain = suiChains.find((c) => c.id === chainId);

      if (!chain) {
        return {
          signer: null,
          isOct,
          chainId,
          error: `Chain not found: ${chainId}`,
          signerType: null,
          signingContext: null,
        };
      }

      // 处理 ZkLogin 账户
      if (currentAccount.type === 'ZKLOGIN') {
        const { signer, context } = buildZkLoginContext(currentAccount as ZkLoginAccount, currentPassword);
        const signingContext: VoucherSigningContext = {
          type: 'zklogin',
          signer,
          zkLogin: context,
        };
        const signerType = 'zklogin' as const;

        return {
          signer,
          isOct,
          chainId,
          error: null,
          signerType,
          signingContext,
        };
      }

      // 生成 keypair
      const { privateKey } = getKeypair(chain, currentAccount, currentPassword);

      // 根据是否 OCT 链选择不同的 Keypair 类
      const keypair = isOct
        ? Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(privateKey, 'hex')))
        : MyStenEd25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(privateKey, 'hex')));

      const signingContext: VoucherSigningContext = {
        type: 'standard',
        signer: keypair,
      };
      const signerType = 'standard' as const;

      return {
        signer: keypair,
        isOct,
        chainId,
        error: null,
        signerType,
        signingContext,
      };
    } catch (error) {
      console.error('Failed to get signer:', error);
      return {
        signer: null,
        isOct: false,
        chainId: 'oct',
        error: (error as Error).message,
        signerType: null,
        signingContext: null,
      };
    }
  }, [currentAccount, currentPassword, selectedChainFilterId, accountAllAssets]);

  return result;
}
