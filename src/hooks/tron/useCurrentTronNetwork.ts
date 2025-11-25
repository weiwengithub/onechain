import { useMemo } from 'react';

import type { TronChain } from '@/types/chain';
import { emitToWeb } from '@/utils/message';
import { getUniqueChainId, isMatchingUniqueChainId } from '@/utils/queryParamGenerator';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import { useChainList } from '../useChainList';

export function useCurrentTronNetwork() {
  const { chainList } = useChainList();
  const { chosenTronNetworkId, approvedOrigins, updateExtensionStorageStore } = useExtensionStorageStore((state) => state);

  const allTronChains = useMemo(() => [...(chainList?.allTronChains || [])], [chainList?.allTronChains]);
  const additionalTronNetworks = useMemo(() => [], []);

  const currentAccountSelectedTronNetworkId = useMemo(() => {
    const selectedTronChain = allTronChains.find((network) => isMatchingUniqueChainId(network, chosenTronNetworkId)) || allTronChains[0];

    return selectedTronChain ? getUniqueChainId(selectedTronChain) : '';
  }, [allTronChains, chosenTronNetworkId]);

  const currentTronNetwork = useMemo(
    () => allTronChains.find((network) => isMatchingUniqueChainId(network, currentAccountSelectedTronNetworkId)),
    [allTronChains, currentAccountSelectedTronNetworkId],
  );

  const setCurrentTronNetwork = async (network: TronChain) => {
    const newSelectedTronNetworkId = getUniqueChainId(network);

    await updateExtensionStorageStore('chosenTronNetworkId', newSelectedTronNetworkId);

    const origins = Array.from(new Set(approvedOrigins.map((item) => item.origin)));

    emitToWeb({ event: 'chainChanged', chainType: 'tron', data: { result: network.chainId } }, origins);
  };

  return {
    tronNetworks: allTronChains,
    additionalTronNetworks,
    currentTronNetwork,
    setCurrentTronNetwork,
  };
}
