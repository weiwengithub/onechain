import useSWR from 'swr';
import { useCallback, useMemo } from 'react';
import Big from 'big.js';
import { getSuiClient } from '@/onechain/utils';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork';
import mainnetConfig from '@/onechain/constant/mainnet.json';
import testnetConfig from '@/onechain/constant/testnet.json';
import { OCT_COIN_TYPE, SUI_COIN_TYPE } from '@/constants/sui';
import { useRwaApi } from '@/onechain/api/RwaApi.ts';

type Props = {
  coinGeckoId?: string;
  coinId?: string;
  refreshInterval?: number;
};

// USDH and USDO token addresses for each network
const QUOTE_TOKENS = {
  mainnet: {
    USDH: {
      address: '0x3d1ecd3dc3c8ecf8cb17978b6b5fe0b06704d4ed87cc37176a01510c45e21c92::usdh::USDH',
      decimals: 9,
    },
    USDO: {
      address: '0x714159631ef1621b67a57db8239d6147492fb8278bfee7b9b734a032110c0fd6::usdo::USDO',
      decimals: 6,
    },
  },
  testnet: {
    USDH: {
      address: '0x72eba41c73c4c2ce2bcfc6ec1dc0896ba1b5c17bfe7ae7c6c779943f84912b41::usdh::USDH',
      decimals: 9,
    },
    USDO: {
      address: '0xf0dbc2d1a28faec23a9d2af8e8bfaff594e370bab0eaf4ea08be456d292c7b34::usdo::USDO',
      decimals: 6,
    },
  },
};

// Helper function to remove 0x prefix and format coin type for LP
const formatCoinType = (coinType: string): string => {
  return coinType.replace(/^0x/i, '');
};

// Helper function to construct LP coin type name
const constructLpCoinType = (
  swapPackage: string,
  swapModule: string,
  coinX: string,
  coinY: string,
  feeType: string,
): string => {
  return `${formatCoinType(swapPackage)}::${swapModule}::LPCoin<${formatCoinType(coinX)},${formatCoinType(coinY)},${formatCoinType(feeType)}>`;
};

export const useRwaPrice = (props: Props) => {
  const { coinGeckoId, coinId, refreshInterval = 60000 } = props;
  const { currentSuiNetwork } = useCurrentSuiNetwork();
  const rwaApi = useRwaApi();

  const isValidRequest = useMemo(() => {
    if (!currentSuiNetwork ||
      !coinGeckoId ||
      !coinId) {
      return false;
    }

    const networkId = currentSuiNetwork.id as string;
    if (!networkId.startsWith('oct')) return false;

    if (
      coinId === OCT_COIN_TYPE ||
      coinId.endsWith('USDH') ||
      coinId.endsWith('USDO')
    ) {
      return false;
    }

    return coinGeckoId.startsWith(networkId);
  }, [currentSuiNetwork, coinGeckoId, coinId]);

  const config = useMemo(() => {
    if (!currentSuiNetwork) return null;
    const isTestnet = currentSuiNetwork.isTestnet;
    return isTestnet ? testnetConfig : mainnetConfig;
  }, [currentSuiNetwork]);

  const rpcUrl = useMemo(() => {
    return currentSuiNetwork?.rpcUrls?.[0]?.url;
  }, [currentSuiNetwork]);

  const isOct = useMemo(() => {
    return currentSuiNetwork?.id ? String(currentSuiNetwork.id).startsWith('oct') : false;
  }, [currentSuiNetwork]);

  const key = useMemo(() => {
    if (!coinId || !currentSuiNetwork || !isValidRequest) return null;
    return `/rwa-price/${currentSuiNetwork.id}/${coinId}`;
  }, [coinId, currentSuiNetwork, isValidRequest]);

  const fetchPrice = useCallback(async (): Promise<{ price: number; percent: number }> => {
    if (!isValidRequest || !config || !rpcUrl || !currentSuiNetwork || !coinId) {
      return { price: 0, percent: 0 };
    }

    try {
      const { networkOptions } = config;
      const { SWAP_PACKAGE, SWAP_MODULE, OBJECT_LIQUIDITY_POOLS, FEE_TYPE } = networkOptions;

      const suiClient = getSuiClient(isOct, rpcUrl);

      const isTestnet = currentSuiNetwork.isTestnet;
      const quoteTokens = isTestnet ? QUOTE_TOKENS.testnet : QUOTE_TOKENS.mainnet;
      // Try USDH first, then USDO as fallback
      for (const [tokenName, tokenInfo] of Object.entries(quoteTokens)) {
        try {
          const quoteCoinType = tokenInfo.address;
          const quoteDecimals = tokenInfo.decimals;

          // Dynamically get RWA token decimals
          let rwaDecimals = 9;
          try {
            const metadata = await suiClient.getCoinMetadata({ coinType: coinId });
            rwaDecimals = metadata?.decimals ?? 9; // fallback to 9 if not found
          } catch (error) {
            console.warn('Failed to get RWA token metadata, using default decimals 9:', error);
          }

          // Try both pool directions: (RWA, Quote) and (Quote, RWA)
          const lpCoinType1 = constructLpCoinType(
            SWAP_PACKAGE,
            SWAP_MODULE,
            coinId,
            quoteCoinType,
            FEE_TYPE,
          );

          const lpCoinType2 = constructLpCoinType(
            SWAP_PACKAGE,
            SWAP_MODULE,
            quoteCoinType,
            coinId,
            FEE_TYPE,
          );

          // Query first direction (RWA, Quote)
          let obj: any;
          try {
            obj = await suiClient.getDynamicFieldObject({
              parentId: OBJECT_LIQUIDITY_POOLS,
              name: {
                type: '0x1::ascii::String',
                value: lpCoinType1,
              },
            });
          } catch (e) {
            // If first direction fails, try second direction
            obj = null;
          }

          // If first direction didn't work, try second direction (Quote, RWA)
          if (!obj?.data?.content) {
            try {
              obj = await suiClient.getDynamicFieldObject({
                parentId: OBJECT_LIQUIDITY_POOLS,
                name: {
                  type: '0x1::ascii::String',
                  value: lpCoinType2,
                },
              });
            } catch (e) {
              // If both directions fail, continue to next quote token
              continue;
            }
          }

          // Parse the response
          if (obj?.data?.content) {
            const content: any = obj.data.content;
            const fields = content?.fields?.value?.fields;

            if (fields) {
              let rwaReserve: string;
              let quoteReserve: string;

              // Check which direction the pool is in
              // If we queried (RWA, Quote): coin_x = RWA, coin_y = Quote
              // If we queried (Quote, RWA): coin_x = Quote, coin_y = RWA
              const isRwaFirst = lpCoinType1 === (obj?.data?.content as any)?.type ||
                fields.coin_x_reserve !== undefined;

              if (obj?.data?.content && 'type' in obj.data.content) {
                const poolType = (obj.data.content as any).type as string;
                // Check if RWA token type appears first in the pool type
                const rwaTypeShort = formatCoinType(coinId);
                const quoteTypeShort = formatCoinType(quoteCoinType);
                const isRwaFirstInType = poolType.indexOf(rwaTypeShort) < poolType.indexOf(quoteTypeShort);

                if (isRwaFirstInType) {
                  rwaReserve = fields.coin_x_reserve;
                  quoteReserve = fields.coin_y_reserve;
                } else {
                  rwaReserve = fields.coin_y_reserve;
                  quoteReserve = fields.coin_x_reserve;
                }
              } else {
                // Fallback: assume the order matches lpCoinType1
                rwaReserve = fields.coin_x_reserve;
                quoteReserve = fields.coin_y_reserve;
              }

              if (rwaReserve && quoteReserve) {
                // Scale by decimals
                const rwaReserveScaled = new Big(rwaReserve).div(Math.pow(10, rwaDecimals));
                const quoteReserveScaled = new Big(quoteReserve).div(Math.pow(10, quoteDecimals));

                // Calculate price: quote / rwa
                if (rwaReserveScaled.gt(0)) {
                  const price = quoteReserveScaled.div(rwaReserveScaled).toNumber();
                  return { price, percent: 0 };
                }
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch price with ${tokenName}:`, error);
          // Continue to next quote token
          // continue;
        }
      }

      // If we get here, no liquidity pool was found
      // Try fetching from RWA API as fallback
      try {
        const contractAddress = coinId.split('::')[0];
        const response = await rwaApi.getRwaProjectDetail(contractAddress);

        if (response?.code === 200 && response?.data?.issuePrice) {
          const price = Number(response.data.issuePrice);
          return { price, percent: 0 };
        }
      } catch (apiError) {
        console.error('Failed to fetch price from RWA API:', apiError);
      }

      // If both liquidity pool and API failed, return 0
      return { price: 0, percent: 0 };
    } catch (error) {
      console.error('Error fetching RWA price:', error);
      return { price: 0, percent: 0 };
    }
  }, [coinId, isValidRequest, config, rpcUrl, isOct, currentSuiNetwork, rwaApi]);

  // Use SWR for data fetching with caching and revalidation
  const { data, error, mutate, isLoading } = useSWR<{ price: number; percent: number }, Error>(
    key,
    fetchPrice,
    {
      refreshInterval,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  // Return hook result
  return useMemo(() => {
    return {
      price: data?.price ?? 0,
      percent: data?.percent ?? 0,
      error,
      isLoading,
      refetch: mutate,
    };
  }, [data, error, isLoading, mutate]);
};
