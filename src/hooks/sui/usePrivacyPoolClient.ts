/**
 * Privacy Pool Client Hook
 * 提供 Privacy Pool 客户端实例
 */

import { useMemo } from 'react';
import { useCurrentSuiNetwork } from './useCurrentSuiNetwork';
import { PrivacyPoolClient } from '@/libs/privacyPool/client';
import { PRIVACY_POOL_CONFIG } from '@/constants/privacyPool';

export function usePrivacyPoolClient() {
  const { currentSuiNetwork } = useCurrentSuiNetwork();

  const client = useMemo(() => {
    if (!currentSuiNetwork) return null;

    return new PrivacyPoolClient(
      currentSuiNetwork.rpcUrls[0].url,
      PRIVACY_POOL_CONFIG.PACKAGE_ID,
      PRIVACY_POOL_CONFIG.CONFIG_ID
    );
  }, [currentSuiNetwork]);

  return client;
}
