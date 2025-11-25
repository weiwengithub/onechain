import mainnetConfig from '@/onechain/constant/mainnet.json';
import testnetConfig from '@/onechain/constant/testnet.json';

export type OneChainNetwork = 'oct' | 'oct-testnet';

export interface OneChainNetworkConfig {
  rightNetwork: string;
  chainName: string;
  explorerUrl?: string;
  networkOptions?: Record<string, string>;
  useGasPool?: number;
  gasBudget?: number;
  reserveDurationSecs?: number;
}

const CONFIG_MAP: Record<OneChainNetwork, OneChainNetworkConfig> = {
  oct: mainnetConfig as OneChainNetworkConfig,
  'oct-testnet': testnetConfig as OneChainNetworkConfig,
};

export function getOneChainNetworkConfig(network: OneChainNetwork): OneChainNetworkConfig {
  return CONFIG_MAP[network] || CONFIG_MAP.oct;
}
