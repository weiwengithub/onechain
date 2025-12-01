import axios from 'axios';
import { PromisePool } from '@supercharge/promise-pool';

import { updateHiddenAssets } from '@/libs/asset';
import { getChains } from '@/libs/chain';
import type { V11Asset, V11Cw20, V11Erc20, V11Param } from '@/types/apiV11';
import type { CosmosCw20Asset, EvmErc20Asset } from '@/types/asset';
import type { ExtensionStorage } from '@/types/extension';
import { getCoinId } from '@/utils/queryParamGenerator';
import {
  AWS_URL, eth_mainnet_assets, eth_mainnet_coin,
  oct_mainnet_assets,
  oct_testnet_assets,
  octMainnet,
  octTestnet,
  sui_mainnet_assets,
  sui_testnet_assets,
  suiTestnet,
  tronMainnet,
  tronTestnet,
  tron_mainnet_assets,
  tron_testnet_assets,
} from '@/script/service-worker/update/constant.ts';
import { SUI_COIN_TYPE } from '@/constants/sui';
import erc20Json from '@/onechain/s3/erc20.json';

// params, assets, erc20, cw20
export async function v11() {
  console.time('chainsAndAsset');
  try {
    // const paramsUrl = 'https://front.api.mintscan.io/v11/utils/params';
    //  https://file.one-wallet.cc/appInfo/chains.json
    const now = Date.now();
    const paramsUrl = `${AWS_URL}/appInfo/chains.json?time=${now}`;
    const paramResponse = await axios.get<Record<string, V11Param>>(paramsUrl);
    const params = paramResponse.data;

    // const filterKeys = ['aptos', 'arbitrum', 'bitcoin', 'bnb-smart-chain', 'cosmos', 'cosmos-testnet', 'ethereum', 'kava', 'kava-testnet', 'okc', 'polygon', 'sui'];
    const filterKeys = ['aptos', 'bitcoin', 'cosmos', 'cosmos-testnet', 'ethereum', 'sui'];
    const filteredChains: Record<string, V11Param> = Object.fromEntries(
      Object.entries(params).filter(([key]) => filterKeys.includes(key)),
    );
    // 手动添加oct主网, oct测试网, sui测试网, tron主网, tron测试网

    // @ts-expect-error -- oct
    filteredChains['oct'] = octMainnet;
    // @ts-expect-error -- oct-testnet
    filteredChains['oct-testnet'] = octTestnet;
    // @ts-expect-error -- sui-testnet
    filteredChains['sui-testnet'] = suiTestnet;
    // @ts-expect-error -- tron
    filteredChains['tron'] = tronMainnet;
    // @ts-expect-error -- tron-testnet
    filteredChains['tron-testnet'] = tronTestnet;

    // const chains = params;

    if (!filteredChains || Object.keys(filteredChains).length === 0) {
      throw new Error('No chains found');
    }

    // const assetsUrl = 'https://front.api.mintscan.io/v11/assets';
    //  https://file.one-wallet.cc/appInfo/assets.json
    const assetsUrl = `${AWS_URL}/appInfo/assets.json?time=${now}`;

    const assetResponse = await axios.get<Record<'assets', V11Asset[]>>(assetsUrl);
    const assets = assetResponse.data?.assets ?? [];

    // const suiList = res.filter(item => item.chain === 'sui' && item.denom !== SUI_COIN_TYPE);

    // console.log("      suiList", suiList);

    // 手动添加assets
    // const assets = [...suiList, ...sui_mainnet_assets, ...sui_testnet_assets, ...oct_mainnet_assets, ...oct_testnet_assets];

    // console.log('      all assets', assets);

    if (!assets || assets.length === 0) {
      throw new Error('No assets found');
    }

    const newAssets = [...assets, ...eth_mainnet_coin, ...tron_mainnet_assets, ...tron_testnet_assets];

    // Preserve user-added custom assets (type: 'bridge') before overwriting
    let existingUserAssets: V11Asset[] = [];
    try {
      const currentStorage = await chrome.storage.local.get<Pick<ExtensionStorage, 'assetsV11'>>(['assetsV11']);
      if (currentStorage.assetsV11) {
        existingUserAssets = currentStorage.assetsV11.filter(asset => asset.type === 'bridge');
      }
    } catch (error) {
      console.warn('Failed to read existing user assets:', error);
    }

    // Merge system assets with preserved user assets, avoiding duplicates
    const mergedAssets = [...newAssets];

    existingUserAssets.forEach(userAsset => {
      // Check if user asset already exists in system assets (by denom + chain)
      const isDuplicate = newAssets.some(
        systemAsset => systemAsset.denom === userAsset.denom && systemAsset.chain === userAsset.chain,
      );

      if (!isDuplicate) {
        mergedAssets.push(userAsset);
      }
    });

    await chrome.storage.local.set<Pick<ExtensionStorage, 'paramsV11' | 'assetsV11'>>({
      paramsV11: filteredChains,
      assetsV11: mergedAssets,
    });

    const { cosmosChains, evmChains } = await getChains();

    // ERC20
    const erc20AssetsSource = (erc20Json as V11Erc20[]).filter((asset) => evmChains.some((chain) => chain.id === asset.chain));

    // @ts-ignore
    const erc20Assets: EvmErc20Asset[] = erc20AssetsSource
      .map((asset) => {
        return {
          ...asset,
          id: asset.contract?.toLowerCase(),
          chainId: asset.chain,
          type: 'erc20',
          chainType: 'evm',
        };
      })
      .filter((asset) => asset.id);

    // cw20
    const cosmosChainsWithCosmwasm = cosmosChains.filter((chain) => chain.isCosmwasm);

    const { results: cw20AssetsResponse } = await PromisePool.withConcurrency(5)
      .for(cosmosChainsWithCosmwasm)
      .handleError((error) => {
        throw error;
      })
      .process(async (cosmosChain) => {
        const { id } = cosmosChain;
        const cw20AssetResponse = await axios.get<V11Cw20[]>(`https://front.api.mintscan.io/v11/assets/${id}/cw20/info`);
        const cw20Asset = cw20AssetResponse.data;

        const cw20Assets: CosmosCw20Asset[] = cw20Asset.map((asset) => {
          return {
            ...asset,
            id: asset.contract,
            chainId: id,
            chainType: 'cosmos',
            type: 'cw20',
          };
        });
        return cw20Assets;
      });

    const cw20Assets = cw20AssetsResponse.flat();

    await hideNewContractTokens(erc20Assets, cw20Assets);

    await chrome.storage.local.set<Pick<ExtensionStorage, 'erc20Assets' | 'cw20Assets'>>({
      erc20Assets,
      cw20Assets,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`${error.request?.method} ${error.request?.url} ${error.cause?.message}`);
    } else {
      console.error(error);
    }
  } finally {
    console.timeEnd('chainsAndAsset');
  }
}

async function hideNewContractTokens(erc20Assets: EvmErc20Asset[], cw20Assets: CosmosCw20Asset[]) {
  const {
    userAccounts: storedAccounts,
    erc20Assets: storedERC20AssetsV11,
    cw20Assets: storedCW20Assets,
  } = await chrome.storage.local.get<ExtensionStorage>(['userAccounts', 'erc20Assets', 'cw20Assets']);

  const storedAccountsList = storedAccounts || [];
  const storedAccountsIds = storedAccountsList.map((account) => account.id);

  const storedERC20Data = storedERC20AssetsV11 || [];
  const storedCW20Data = storedCW20Assets || [];

  const storedERC20Set = new Set(storedERC20Data.map((asset) => getCoinId(asset)));
  const storedCW20Set = new Set(storedCW20Data.map((asset) => getCoinId(asset)));

  const newERC20Assets =
    storedERC20Set.size === 0 ? [] : erc20Assets.filter((asset) => !storedERC20Set.has(getCoinId(asset))).filter((asset) => !asset.wallet_preload);

  const newCW20Assets =
    storedCW20Set.size === 0 ? [] : cw20Assets.filter((asset) => !storedCW20Set.has(getCoinId(asset))).filter((asset) => !asset.wallet_preload);

  const mergedNewContractAssets = [...newERC20Assets, ...newCW20Assets];

  if (mergedNewContractAssets.length > 0) {
    const hiddenAssetIds = mergedNewContractAssets.map((asset) => ({
      id: asset.id,
      chainId: asset.chainId,
      chainType: asset.chainType,
    }));

    const updatedHiddenAssetsPromises = storedAccountsIds.map((id) => updateHiddenAssets(id, hiddenAssetIds));

    await Promise.all(updatedHiddenAssetsPromises);
  }
}
