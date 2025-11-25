import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EthermintFilterChainSelectBox from '@/components/EthermintFilterChainSelectBox/index.tsx';
import { useChainList } from '@/hooks/useChainList.ts';
import type { EvmChain, SuiChain, UniqueChainId } from '@/types/chain.ts';
import { getUniqueChainId, isMatchingUniqueChainId } from '@/utils/queryParamGenerator.ts';

import { Container } from './-styled.tsx';
import { LabelText } from '@components/EthermintFilterChainSelectBox/styled.tsx';
import Button from '@/components/common/Button';
import { getSuiClient } from '@/onechain/utils';
import type { CoinMetadata } from '@onelabs/sui/client';
import type { V11Asset } from '@/types/apiV11.ts';
import { toastError, toastSuccess } from '@/utils/toast.tsx';
import { getExtensionLocalStorage } from '@/utils/storage';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { Token_URL } from '@/script/service-worker/update/constant.ts';
import { useDebounce } from 'use-debounce';
import { isZkLoginAccount } from '@/utils/zklogin';
import { ZKLOGIN_SUPPORTED_CHAIN_ID } from '@/constants/zklogin';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import ImportERC20Form from './-components/ImportERC20Form';
import ContractAddressInput from './-components/ContractAddressInput';

export default function Entry() {
  const { t } = useTranslation();

  const { chainList } = useChainList();
  const {
    updateExtensionStorageStore,
    selectedChainFilterId,
    isDeveloperMode,
  } = useExtensionStorageStore((state) => state);
  const { currentAccount } = useCurrentAccount();
  const [contractText, setContractText] = useState('');
  const [debouncedContract] = useDebounce(contractText, 500);
  const [loading, setLoading] = useState(false);

  // Auto query states
  const [queryResult, setQueryResult] = useState<V11Asset | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [lastQueriedContract, setLastQueriedContract] = useState('');

  const suiChains = useMemo(() => {
    if (chainList?.suiChains) {
      // 如果当前账户是 zklogin 账户，只显示支持的链
      if (currentAccount && isZkLoginAccount(currentAccount)) {
        return chainList.suiChains.filter((chain) => chain.id === ZKLOGIN_SUPPORTED_CHAIN_ID);
      } else {
        const res: SuiChain[] = [];
        chainList.suiChains.forEach((item) => {
          // 如果开启开发者模式，保留测试网(就是所有网络)
          if (isDeveloperMode || !item.isTestnet) {
            res.push(item);
          }
        });
        return res;
      }
    }
    return [];
  }, [chainList, currentAccount, isDeveloperMode]);

  const evmChains = useMemo(() => {
    if (chainList?.evmChains) {
      return chainList.evmChains.filter((chain) => isDeveloperMode || !chain.isTestnet);
    }
    return [];
  }, [chainList, isDeveloperMode]);

  const selectableChains = useMemo<(SuiChain | EvmChain)[]>(() => {
    return [...suiChains, ...evmChains];
  }, [evmChains, suiChains]);

  const defaultChain = useMemo(() => {
    if (selectableChains.length === 0) return undefined;

    const preferredOrder: { id: string; chainType: SuiChain['chainType'] | EvmChain['chainType'] }[] = [
      { id: 'oct', chainType: 'sui' },
      { id: 'sui', chainType: 'sui' },
      { id: 'ethereum', chainType: 'evm' },
    ];

    for (const preferred of preferredOrder) {
      const matched = selectableChains.find((chain) => chain.id === preferred.id && chain.chainType === preferred.chainType);
      if (matched) return matched;
    }

    return selectableChains[0];
  }, [selectableChains]);

  const defaultChainId = useMemo(() => {
    if (selectedChainFilterId) {
      return selectedChainFilterId;
    }
    return defaultChain ? getUniqueChainId(defaultChain) : undefined;
  }, [defaultChain, selectedChainFilterId]);

  const [currentChainId, setCurrentChainId] = useState<UniqueChainId | undefined>(defaultChainId);

  const currentChain = useMemo(() => {
    return selectableChains.find((chain) => isMatchingUniqueChainId(chain, currentChainId));
  }, [currentChainId, selectableChains]);

  const isSuiChain = currentChain?.chainType === 'sui';
  const isEvmChain = currentChain?.chainType === 'evm';

  const suiClient = useMemo(() => {
    if (!currentChain || !isSuiChain) return undefined;
    const rpcUrl = currentChain.rpcUrls[0].url;
    const isOct = currentChain.id.startsWith('oct');
    return getSuiClient(isOct, rpcUrl);
  }, [currentChain, isSuiChain]);

  const handleAutoQuery = useCallback(async (contract: string) => {
    if (!suiClient || !contract.trim() || !currentChain || !isSuiChain) return;

    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res: CoinMetadata | null = await suiClient.getCoinMetadata({ coinType: contract.trim() });

      if (res) {
        let iconUrl: string = isValidUrl(res.iconUrl) ? res.iconUrl! : '';
        if (currentChain.isTestnet) {
          iconUrl = `${Token_URL}alphabet/${res.symbol[0]}.png`;
        }

        const asset: V11Asset = {
          symbol: res.symbol,
          chain: currentChain.id,
          type: 'bridge',
          denom: contract.trim(),
          name: res.name,
          description: res.description,
          decimals: res.decimals,
          image: iconUrl,
          coinGeckoId: `${currentChain.id}-${res.symbol}`,
          isCustom: true,
        };

        setQueryResult(asset);
        console.log('Auto query result:', asset);
      } else {
        setQueryError('No coin metadata found');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed';
      setQueryError(errorMessage);
      console.error('Auto query error:', errorMessage);
    } finally {
      setQueryLoading(false);
    }
  }, [suiClient, currentChain, isSuiChain]);

  useEffect(() => {
    if (!currentChainId) {
      setCurrentChainId(defaultChainId);
    }
  }, [currentChainId, defaultChainId]);

  // Auto query when debouncedContract changes
  useEffect(() => {
    const contractToQuery = debouncedContract.trim();

    // Clear previous results when contract text changes
    if (contractToQuery !== lastQueriedContract) {
      setQueryResult(null);
      setQueryError(null);
    }

    // Only query if contract is valid and different from last query
    if (!isSuiChain || !suiClient) {
      setLastQueriedContract('');
      setQueryResult(null);
      setQueryError(null);
      setQueryLoading(false);
      return;
    }

    if (contractToQuery && contractToQuery !== lastQueriedContract) {
      setLastQueriedContract(contractToQuery);
      handleAutoQuery(contractToQuery);
    } else if (!contractToQuery) {
      // Clear results when contract text is empty
      setLastQueriedContract('');
      setQueryResult(null);
      setQueryError(null);
      setQueryLoading(false);
    }
  }, [debouncedContract, isSuiChain, suiClient, handleAutoQuery, lastQueriedContract]);


  const canNext = useMemo(() => {
    return isSuiChain && queryResult && !loading && !queryLoading;
  }, [isSuiChain, queryResult, loading, queryLoading]);

  const addAssetToStorage = useCallback(async (asset: V11Asset) => {
    try {
      // Get current assetsV11 from storage
      const currentAssetsV11 = await getExtensionLocalStorage('assetsV11');

      // Check if asset already exists (by denom + chain combination)
      const isAlreadyAdded = currentAssetsV11.some(
        (existingAsset) =>
          existingAsset.denom === asset.denom &&
          existingAsset.chain === asset.chain,
      );

      if (isAlreadyAdded) {
        toastError(t('pages.manage-assets.import.assets.entry.toastAssetExists'));
        return false;
      }

      // Add new asset to array
      const updatedAssetsV11 = [...currentAssetsV11, asset];

      // Update storage
      await updateExtensionStorageStore('assetsV11', updatedAssetsV11);

      return true;
    } catch (error) {
      console.error('Error adding asset to storage:', error);
      toastError(t('pages.manage-assets.import.assets.entry.toastStorageFailed'));
      return false;
    }
  }, [updateExtensionStorageStore]);

  const isValidUrl = (str?: string | null) => {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  };


  const handleConfirm = useCallback(async () => {
    if (!isSuiChain || !queryResult) {
      toastError(t('pages.manage-assets.import.assets.entry.toastNoAsset'));
      return;
    }

    setLoading(true);
    try {
      // Add asset to storage (includes duplicate checking)
      const success = await addAssetToStorage(queryResult);

      if (success) {
        toastSuccess(t('pages.manage-assets.import.assets.entry.toastAddSuccess', { symbol: queryResult.symbol }));
        // Clear the form and results
        setContractText('');
        setQueryResult(null);
        setQueryError(null);
        setLastQueriedContract('');
        console.log('Asset added to assetsV11:', queryResult);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('pages.manage-assets.import.assets.entry.toastAddFailed');
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isSuiChain, queryResult, addAssetToStorage, t]);

  return (
    <BaseBody>
      <div style={{ paddingBottom: '130px' }}>
        <Container>
          <EthermintFilterChainSelectBox
            chainList={selectableChains}
            currentSelectedChain={currentChain}
            onClickChain={(chainId) => {
              setCurrentChainId(chainId);
              setContractText('');
            }}
            label={t('pages.manage-assets.import.assets.entry.network')}
            bottomSheetTitle={t('pages.manage-assets.import.assets.entry.selectNetwork')}
            bottomSheetSearchPlaceholder={t('pages.manage-assets.import.assets.entry.searchNetwork')}
            customVarient="contract-token"
          />
        </Container>

        {isSuiChain && (
          <>
            <ContractAddressInput
              labelClassName="mt-12"
              value={contractText}
              onChange={(event) => {
                setContractText(event.target.value);
              }}
            />

            <div className={'mt-10'}>
              {queryLoading && (
                <div className="mt-2 text-[16px] text-blue-400">
                  {t('pages.manage-assets.import.assets.entry.searching')}
                </div>
              )}

              {queryError && (
                <div className="mt-2 text-[16px] text-red-400">
                  {queryError}
                </div>
              )}

              {queryResult && (
                <>
                  <LabelText className={'mt-10'}>{t('pages.manage-assets.import.assets.entry.tokenDetail')}</LabelText>
                  <div className="mt-2 p-6 bg-[#1E2025] rounded-[16px]">
                    <div className="text-[16px] text-white font-medium mt-4">
                      {queryResult.symbol}
                    </div>
                    <div className="text-gray-400 text-[16px] mt-4">
                      {t('pages.manage-assets.import.assets.entry.decimals', { value: queryResult.decimals })}
                    </div>
                    <div className="text-gray-400 text-[16px] mt-4">
                      {t('pages.manage-assets.import.assets.entry.description', { value: queryResult.description })}
                    </div>
                  </div>
                </>

              )}
            </div>

            <div
              className="fixed bottom-3 left-8 right-8 backdrop-blur-md rounded-xl p-4 z-[1000]"
            >
              <Button
                onClick={handleConfirm}
                disabled={!canNext}
                isProgress={loading}
              >
                {loading
                  ? t('pages.manage-assets.import.assets.entry.addingAsset')
                  : queryResult
                    ? t('pages.manage-assets.import.assets.entry.addSpecificAsset', { symbol: queryResult.symbol })
                    : t('pages.manage-assets.import.assets.entry.addAsset')}
              </Button>
            </div>
          </>
        )}

        {isEvmChain && currentChain && (
          <ImportERC20Form
            chainId={getUniqueChainId(currentChain)}
          />
        )}

        {/*{currentChain?.chainType === 'evm' ? (*/}
        {/*  <ERC20 chainId={getUniqueChainId(currentChain)} />*/}
        {/*) : currentChain?.chainType === 'cosmos' && currentChain?.isCosmwasm ? (*/}
        {/*  <CW20 chainId={getUniqueChainId(currentChain)} />*/}
        {/*) : null}*/}
      </div>
    </BaseBody>
  );
}
