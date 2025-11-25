import { produce } from 'immer';

import { AD_POPOVER_IDS } from '@/constants/adPopover';
import { CURRENCY_TYPE } from '@/constants/currency';
import { DefaultSortKey } from '@/constants/initialStorage';
import { PRICE_TREND_TYPE } from '@/constants/price';
import { ZKLOGIN_SUPPORTED_CHAIN_ID } from '@/constants/zklogin';
import { getAddedCustomChains, getChains } from '@/libs/chain';
import { v11 } from '@/script/service-worker/update/v11';
import type { AccountNamesById, ChainToAccountTypeMap, PreferAccountType } from '@/types/account';
import type {
  AdPopoverStateMap,
  ExtensionSessionStorage,
  ExtensionSessionStorageKeys,
  ExtensionStorage,
  ExtensionStorageKeys,
  PrioritizedProvider,
} from '@/types/extension';
import type { AptosChain, BitcoinChain, EvmChain, IotaChain, SuiChain } from '@/types/chain';
import { initialState } from '@/zustand/hooks/useExtensionStorageStore';

import { extension } from './browser';
import { aesDecrypt } from './crypto';
import { getUniqueChainId, isMatchingUniqueChainId } from './queryParamGenerator';

// Default network configurations to prevent null returns
const DEFAULT_ETHEREUM_NETWORK: EvmChain = {
  id: 'ethereum',
  chainType: 'evm',
  name: 'Ethereum',
  image: null,
  chainId: '1',
  mainAssetDenom: 'ETH',
  chainDefaultCoinDenoms: ['ETH'],
  isCosmos: false,
  feeInfo: {
    isEip1559: true,
    gasCoefficient: 1.2,
  },
  rpcUrls: [
    {
      provider: 'default',
      url: 'https://eth.llamarpc.com',
    },
  ],
  accountTypes: [
    {
      hdPath: "m/44'/60'/0'/0/0",
      pubkeyStyle: 'secp256k1',
      isDefault: true,
      pubkeyType: null,
    },
  ],
  explorer: {
    name: 'Etherscan',
    url: 'https://etherscan.io',
    account: 'https://etherscan.io/address/{address}',
    tx: 'https://etherscan.io/tx/{tx}',
    proposal: '',
  },
};

const DEFAULT_SUI_NETWORK: SuiChain = {
  id: 'oct-testnet',
  chainType: 'sui',
  name: 'Oct Testnet',
  image: null,
  chainId: '35834a8a',
  mainAssetDenom: 'SUI',
  chainDefaultCoinDenoms: ['0x2::sui::SUI'],
  rpcUrls: [
    {
      provider: 'default',
      url: 'https://sui-testnet-endpoint.blockvision.org',
    },
  ],
  accountTypes: [
    {
      hdPath: "m/44'/784'/0'/0'/0'",
      pubkeyStyle: 'ed25519',
      isDefault: true,
      pubkeyType: null,
    },
  ],
  explorer: {
    name: 'Oct Explorer',
    url: 'https://explorer.oct.network',
    account: 'https://explorer.oct.network/address/{address}',
    tx: 'https://explorer.oct.network/txblock/{tx}',
    proposal: '',
  },
  isTestnet: true,
};

const DEFAULT_APTOS_NETWORK: AptosChain = {
  id: 'aptos-testnet',
  chainType: 'aptos',
  name: 'Aptos Testnet',
  image: null,
  chainId: 2,
  mainAssetDenom: 'APT',
  chainDefaultCoinDenoms: ['0x1::aptos_coin::AptosCoin'],
  rpcUrls: [
    {
      provider: 'default',
      url: 'https://fullnode.testnet.aptoslabs.com/v1',
    },
  ],
  accountTypes: [
    {
      hdPath: "m/44'/637'/0'/0'/0'",
      pubkeyStyle: 'ed25519',
      isDefault: true,
      pubkeyType: null,
    },
  ],
  explorer: {
    name: 'Aptos Explorer',
    url: 'https://explorer.aptoslabs.com',
    account: 'https://explorer.aptoslabs.com/account/{address}?network=testnet',
    tx: 'https://explorer.aptoslabs.com/txn/{tx}?network=testnet',
    proposal: '',
  },
  isTestnet: true,
};

const DEFAULT_BITCOIN_NETWORK: BitcoinChain = {
  id: 'bitcoin-testnet',
  chainType: 'bitcoin',
  name: 'Bitcoin Testnet',
  image: null,
  chainId: 'testnet',
  mainAssetDenom: 'BTC',
  chainDefaultCoinDenoms: ['BTC'],
  rpcUrls: [
    {
      provider: 'default',
      url: 'https://blockstream.info/testnet/api',
    },
  ],
  mempoolURL: 'https://blockstream.info/testnet/api',
  accountTypes: [
    {
      hdPath: "m/44'/1'/0'/0/0",
      pubkeyStyle: 'secp256k1',
      isDefault: true,
      pubkeyType: 'legacy',
    },
  ],
  explorer: {
    name: 'Blockstream',
    url: 'https://blockstream.info/testnet',
    account: 'https://blockstream.info/testnet/address/{address}',
    tx: 'https://blockstream.info/testnet/tx/{tx}',
    proposal: '',
  },
  isTestnet: true,
};

const DEFAULT_IOTA_NETWORK: IotaChain = {
  id: 'iota-testnet',
  chainType: 'iota',
  name: 'IOTA Testnet',
  image: null,
  chainId: 'testnet',
  mainAssetDenom: 'IOTA',
  chainDefaultCoinDenoms: ['0x2::iota::IOTA'],
  rpcUrls: [
    {
      provider: 'default',
      url: 'https://api.testnet.iota.org',
    },
  ],
  accountTypes: [
    {
      hdPath: "m/44'/4218'/0'/0'/0'",
      pubkeyStyle: 'ed25519',
      isDefault: true,
      pubkeyType: null,
    },
  ],
  explorer: {
    name: 'IOTA Explorer',
    url: 'https://explorer.iota.org',
    account: 'https://explorer.iota.org/testnet/address/{address}',
    tx: 'https://explorer.iota.org/testnet/transaction/{tx}',
    proposal: '',
  },
  isTestnet: true,
};

export async function initExtensionLocalStorage() {
  await initializeStorageDefaults();

  await initializeCurrentAccountId();
  await initializeChosenNetworks();

  await setMissingAdPopoverState();

  await setMissingAccountNames();

  await setMissingMnemonicNames();

  await setMissingPreferAccountType();

  await initializePreferAccountType();
}

export async function setExtensionLocalStorage<T extends ExtensionStorageKeys>(key: T, value: ExtensionStorage[T]) {
  await extension.storage.local.set({ [key]: value as ExtensionStorage[T] });
}

export async function getExtensionLocalStorage<T extends ExtensionStorageKeys>(key: T) {
  const localStorage = await extension.storage.local.get(key);

  return localStorage[key] as ExtensionStorage[T];
}

export const deleteKeysContainingString = async (searchString: string): Promise<void> => {
  chrome.storage.local.get(null, (items) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const keysToDelete = Object.keys(items).filter((key) => key.includes(searchString));

    if (keysToDelete.length > 0) {
      chrome.storage.local.remove(keysToDelete, () => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        }
      });
    } else {
      console.log(`No keys found containing the string: "${searchString}"`);
    }
  });
};

export async function getAllExtensionLocalStorage(): Promise<ExtensionStorage> {
  const localStorage = await extension.storage.local.get();

  return localStorage as ExtensionStorage;
}

export async function setExtensionSessionStorage<T extends ExtensionSessionStorageKeys>(key: T, value: ExtensionSessionStorage[T]) {
  await extension.storage.session.set({ [key]: value as ExtensionSessionStorage[T] });
}

export async function getExtensionSessionStorage<T extends ExtensionSessionStorageKeys>(key: T) {
  const sessionStorage = await extension.storage.session.get(key);

  return sessionStorage[key] as ExtensionSessionStorage[T];
}

export async function getAllExtensionSessionStorage(): Promise<ExtensionSessionStorage> {
  const sessionStorage = await extension.storage.session.get();

  return sessionStorage as ExtensionSessionStorage;
}

export async function extensionLocalStorage() {
  const storage = await getAllExtensionLocalStorage();

  const storageWithDefault = { ...initialState, ...storage };

  const {
    userAccounts,
    currentAccountId,
    accountNamesById,
    approvedOrigins,
    preferAccountType,
    chosenAptosNetworkId,
    chosenSuiNetworkId,
    chosenBitcoinNetworkId,
    chosenEthereumNetworkId,
    chosenIotaNetworkId,
  } = storageWithDefault;

  const currentAccount = (() => {
    // If no accounts exist, return null (this is expected on first launch)
    if (userAccounts.length === 0) {
      return null;
    }

    const account = userAccounts.find((account) => account.id === currentAccountId);
    if (!account) {
      console.error('extensionLocalStorage: Account not found', {
        currentAccountId,
        userAccountIds: userAccounts.map(acc => acc.id),
        userAccountsLength: userAccounts.length,
      });
      throw new Error(`Account with id ${currentAccountId} not found in userAccounts. Available accounts: ${userAccounts.map(acc => acc.id).join(', ')}`);
    }
    return account;
  })();
  const currentAccountName = accountNamesById[currentAccountId];

  const { evmChains, aptosChains, suiChains, bitcoinChains, iotaChains } = await getChains();
  const addedCustomChains = await getAddedCustomChains();

  const currentEthereumNetwork = (() => {
    const ethereumNetworks = [...evmChains, ...addedCustomChains.filter((chain) => chain.chainType === 'evm')];

    if (ethereumNetworks.length === 0) {
      return DEFAULT_ETHEREUM_NETWORK;
    }

    const networkId = chosenEthereumNetworkId ?? getUniqueChainId(ethereumNetworks[0]);

    return ethereumNetworks.find((network) => isMatchingUniqueChainId(network, networkId)) ?? ethereumNetworks[0];
  })();

  const currentAptosNetwork = (() => {
    const aptosNetworks = [...aptosChains];

    if (aptosNetworks.length === 0) {
      return DEFAULT_APTOS_NETWORK;
    }

    const networkId = chosenAptosNetworkId ?? getUniqueChainId(aptosNetworks[0]);

    return aptosNetworks.find((network) => isMatchingUniqueChainId(network, networkId)) ?? aptosNetworks[0];
  })();

  const currentSuiNetwork = (() => {
    const suiNetworks = [...suiChains];

    if (suiNetworks.length === 0) {
      return DEFAULT_SUI_NETWORK;
    }

    // 优先选择 oct 网络作为默认网络
    const defaultSuiNetwork = suiNetworks.find(network => network.id === ZKLOGIN_SUPPORTED_CHAIN_ID) || suiNetworks[0];
    const networkId = chosenSuiNetworkId ?? getUniqueChainId(defaultSuiNetwork);

    return suiNetworks.find((network) => isMatchingUniqueChainId(network, networkId)) ?? defaultSuiNetwork;
  })();

  const currentBitcoinNetwork = (() => {
    const bitcoinNetworks = [...bitcoinChains];

    if (bitcoinNetworks.length === 0) {
      return DEFAULT_BITCOIN_NETWORK;
    }

    const networkId = chosenBitcoinNetworkId ?? getUniqueChainId(bitcoinNetworks[0]);

    const network = bitcoinNetworks.find((network) => isMatchingUniqueChainId(network, networkId)) ?? bitcoinNetworks[0];

    // If no account exists, return the network as-is
    if (!currentAccount) {
      return network;
    }

    const inAppSelectedPubkeyStyle = preferAccountType[currentAccount.id]?.[network.id]?.pubkeyStyle;

    const response = produce(network, (draft) => {
      draft.accountTypes = draft.accountTypes.filter((item) => item.pubkeyStyle === inAppSelectedPubkeyStyle);
    });

    return response;
  })();

  const currentIotaNetwork = (() => {
    const iotaNetworks = [...iotaChains];

    if (iotaNetworks.length === 0) {
      return DEFAULT_IOTA_NETWORK;
    }

    const networkId = chosenIotaNetworkId ?? getUniqueChainId(iotaNetworks[0]);

    return iotaNetworks.find((network) => isMatchingUniqueChainId(network, networkId)) ?? iotaNetworks[0];
  })();

  const currentAccountAllowedOrigins = currentAccount
    ? approvedOrigins
        .filter((allowedOrigin) => allowedOrigin.accountId === currentAccountId)
        .map((allowedOrigin) => allowedOrigin.origin)
    : [];

  const currentAccountAddressInfo = currentAccount
    ? storageWithDefault[`${currentAccount.id}-address`]
    : undefined;

  return {
    ...storageWithDefault,
    currentAccount,
    currentAccountName,
    currentEthereumNetwork,
    currentAptosNetwork,
    currentSuiNetwork,
    currentBitcoinNetwork,
    currentIotaNetwork,
    currentAccountAllowedOrigins,
    currentAccountAddressInfo,
  };
}

export async function extensionSessionStorage() {
  const storage = await getAllExtensionSessionStorage();

  const currentPassword = storage.sessionPassword
    ? aesDecrypt(storage.sessionPassword.encryptedPassword, `${storage.sessionPassword.key}${storage.sessionPassword.timestamp}`)
    : null;

  return {
    ...storage,
    currentPassword,
  };
}

async function initializeStorageDefaults() {
  const originStorage = await getAllExtensionLocalStorage();

  if (!originStorage.paramsV11 || !originStorage.assetsV11) {
    await v11();
  }

  if (!originStorage.userCurrencyPreference) {
    const newCurrency = CURRENCY_TYPE.USD;

    await setExtensionLocalStorage('userCurrencyPreference', newCurrency);
  }
  if (!originStorage.userPriceTrendPreference) {
    await setExtensionLocalStorage('userPriceTrendPreference', PRICE_TREND_TYPE.GREEN_UP);
  }

  if (!originStorage.dappListSortKey) {
    await setExtensionLocalStorage('dappListSortKey', DefaultSortKey.dappListSortKey);
  }

  if (!originStorage.dashboardCoinSortKey) {
    await setExtensionLocalStorage('dashboardCoinSortKey', DefaultSortKey.dashboardCoinSortKey);
  }

  if (!originStorage.chainListSortKey) {
    await setExtensionLocalStorage('chainListSortKey', DefaultSortKey.chainListSortKey);
  }

  if (!originStorage.userAccounts) {
    await setExtensionLocalStorage('userAccounts', []);
  }

  if (!originStorage.accountNamesById) {
    await setExtensionLocalStorage('accountNamesById', {});
  }

  if (!originStorage.mnemonicNamesByHashedMnemonic) {
    await setExtensionLocalStorage('mnemonicNamesByHashedMnemonic', {});
  }

  if (!originStorage.notBackedUpAccountIds) {
    await setExtensionLocalStorage('notBackedUpAccountIds', []);
  }

  if (!originStorage.preferAccountType) {
    await setExtensionLocalStorage('preferAccountType', {});
  }

  if (!originStorage.customErc20Assets) {
    await setExtensionLocalStorage('customErc20Assets', []);
  }

  if (!originStorage.customCw20Assets) {
    await setExtensionLocalStorage('customCw20Assets', []);
  }

  if (!originStorage.addressBookList) {
    await setExtensionLocalStorage('addressBookList', []);
  }

  if (!originStorage.addedCustomChainList) {
    await setExtensionLocalStorage('addedCustomChainList', []);
  }

  if (!originStorage.customAssets) {
    await setExtensionLocalStorage('customAssets', []);
  }

  if (!originStorage.customHiddenAssetIds) {
    await setExtensionLocalStorage('customHiddenAssetIds', []);
  }

  if (!originStorage.customErc20Assets) {
    await setExtensionLocalStorage('customErc20Assets', []);
  }

  if (!originStorage.customCw20Assets) {
    await setExtensionLocalStorage('customCw20Assets', []);
  }

  if (!originStorage.approvedOrigins) {
    await setExtensionLocalStorage('approvedOrigins', []);
  }

  if (!originStorage.requestQueue) {
    await setExtensionLocalStorage('requestQueue', []);
  }

  if (!originStorage.approvedSuiPermissions) {
    await setExtensionLocalStorage('approvedSuiPermissions', []);
  }

  if (!originStorage.approvedIotaPermissions) {
    await setExtensionLocalStorage('approvedIotaPermissions', []);
  }

  if (!originStorage.initCheckLegacyBalanceAccountIds) {
    await setExtensionLocalStorage('initCheckLegacyBalanceAccountIds', []);
  }

  if (originStorage.isBalanceVisible === undefined || originStorage.isBalanceVisible === null) {
    await setExtensionLocalStorage('isBalanceVisible', true);
  }

  if (originStorage.isHideSmalValue === undefined || originStorage.isHideSmalValue === null) {
    await setExtensionLocalStorage('isHideSmalValue', false);
  }

  if (!originStorage.adPopoverState) {
    const defaultState = AD_POPOVER_IDS.reduce((acc: AdPopoverStateMap, cur) => {
      acc[cur] = {
        isVisiable: false,
      };
      return acc;
    }, {});

    await setExtensionLocalStorage('adPopoverState', defaultState);
  }

  if (!originStorage.currentWindowId) {
    await setExtensionLocalStorage('currentWindowId', null);
  }

  if (
    originStorage.prioritizedProvider?.aptos === undefined ||
    originStorage.prioritizedProvider?.metamask === undefined ||
    originStorage.prioritizedProvider?.keplr === undefined
  ) {
    const newProviders: PrioritizedProvider = {
      aptos: originStorage.prioritizedProvider?.aptos === undefined ? false : originStorage.prioritizedProvider?.aptos,
      keplr: originStorage.prioritizedProvider?.keplr === undefined ? false : originStorage.prioritizedProvider?.keplr,
      metamask: originStorage.prioritizedProvider?.metamask === undefined ? false : originStorage.prioritizedProvider?.metamask,
    };

    await setExtensionLocalStorage('prioritizedProvider', newProviders);
  }

  if (!originStorage.pinnedDappIds) {
    await setExtensionLocalStorage('pinnedDappIds', []);
  }

  if (!originStorage.autoLockTimeInMinutes) {
    await setExtensionLocalStorage('autoLockTimeInMinutes', '30');
  }
}

async function initializeChosenNetworks() {
  const storedChosenEthereumNetworkId = await getExtensionLocalStorage('chosenEthereumNetworkId');
  const storedChosenAptosNetworkId = await getExtensionLocalStorage('chosenAptosNetworkId');
  const storedChosenSuiNetworkId = await getExtensionLocalStorage('chosenSuiNetworkId');
  const storedChosenBitcoinNetworkId = await getExtensionLocalStorage('chosenBitcoinNetworkId');
  const storedChosenIotaNetworkId = await getExtensionLocalStorage('chosenIotaNetworkId');
  const { evmChains, aptosChains, suiChains, bitcoinChains, iotaChains } = await getChains();

  if (!storedChosenEthereumNetworkId) {
    const defaultEVMNetwork = evmChains.find((item) => item.id === 'ethereum') || evmChains[0];

    const defaultEVMNetworkId = getUniqueChainId(defaultEVMNetwork);

    await setExtensionLocalStorage('chosenEthereumNetworkId', defaultEVMNetworkId);
  }

  if (!storedChosenAptosNetworkId) {
    const defaultAptosNetwork = aptosChains.find((item) => item.id === 'aptos') || aptosChains[0];

    const defaultAptosNetworkId = getUniqueChainId(defaultAptosNetwork);

    await setExtensionLocalStorage('chosenAptosNetworkId', defaultAptosNetworkId);
  }

  if (!storedChosenSuiNetworkId) {
    const defaultSuiNetwork = suiChains.find((item) => item.id === ZKLOGIN_SUPPORTED_CHAIN_ID) || suiChains[0];

    const defaultSuiNetworkId = getUniqueChainId(defaultSuiNetwork);

    await setExtensionLocalStorage('chosenSuiNetworkId', defaultSuiNetworkId);
  }

  if (!storedChosenBitcoinNetworkId) {
    const defaultBitcoinNetwork = bitcoinChains.find((item) => item.id === 'bitcoin') || bitcoinChains[0];

    const defaultBitcoinNetworkId = getUniqueChainId(defaultBitcoinNetwork);

    await setExtensionLocalStorage('chosenBitcoinNetworkId', defaultBitcoinNetworkId);
  }

  if (!storedChosenIotaNetworkId && iotaChains.length > 0) {
    const defaultIotaNetwork = iotaChains.find((item) => item.id === 'iota') || iotaChains[0];

    const defaultIotaNetworkId = getUniqueChainId(defaultIotaNetwork);

    await setExtensionLocalStorage('chosenIotaNetworkId', defaultIotaNetworkId);
  }
}

async function initializeCurrentAccountId() {
  const storedCurrentAccountId = await getExtensionLocalStorage('currentAccountId');
  const storedUserAccounts = await getExtensionLocalStorage('userAccounts');

  const defaultAccountId = storedCurrentAccountId || (storedUserAccounts && storedUserAccounts.length > 0 ? storedUserAccounts[0]?.id || '' : '');

  await setExtensionLocalStorage('currentAccountId', defaultAccountId);
}

async function setMissingMnemonicNames() {
  const mnemonicNamesStorage = await getExtensionLocalStorage('mnemonicNamesByHashedMnemonic');
  const userAccounts = await getExtensionLocalStorage('userAccounts');

  if (mnemonicNamesStorage && userAccounts && userAccounts.length > 0) {
    const mnemonicNameKeys = Object.keys(mnemonicNamesStorage);

    const mnemonicAccountsMissingMnemonicNames = userAccounts
      .filter((item) => item.type === 'MNEMONIC')
      .filter((item) => !mnemonicNameKeys.includes(item.encryptedRestoreString));

    if (mnemonicAccountsMissingMnemonicNames.length > 0) {
      const totalMnemonicNames = mnemonicNameKeys.length;

      const uniqueEncryptedRestoreStrings = [...new Set(mnemonicAccountsMissingMnemonicNames.map((item) => item.encryptedRestoreString))];

      const updatedMnemonicNamesByHashedMnemonic = uniqueEncryptedRestoreStrings.reduce((acc: AccountNamesById, cur, i) => {
        acc[cur] = `Mnemonic ${totalMnemonicNames + i + 1}`;
        return acc;
      }, {});

      const mergedMnemonicNamesByHashedMnemonic = { ...mnemonicNamesStorage, ...updatedMnemonicNamesByHashedMnemonic };

      await setExtensionLocalStorage('mnemonicNamesByHashedMnemonic', mergedMnemonicNamesByHashedMnemonic);
    }
  }
}

async function setMissingAccountNames() {
  const userAccounts = await getExtensionLocalStorage('userAccounts');
  const accountNameMap = await getExtensionLocalStorage('accountNamesById');

  const canCheckMissingAccountNames = accountNameMap && userAccounts && userAccounts.length > 0;

  if (canCheckMissingAccountNames) {
    const accountNameKeys = Object.keys(accountNameMap);

    const missingNameAccounts = userAccounts.filter((item) => !accountNameKeys.includes(item.id));

    if (missingNameAccounts.length > 0) {
      const totalAccountNames = accountNameKeys.length;

      const uniqueMissingNamesAccountIds = [...new Set(missingNameAccounts.map((item) => item.id))];

      const newAccountNameMapping = uniqueMissingNamesAccountIds.reduce((acc: AccountNamesById, cur, i) => {
        acc[cur] = `Account ${totalAccountNames + i + 1}`;
        return acc;
      }, {});

      const mergedAccountNamesById = { ...accountNameMap, ...newAccountNameMapping };

      await setExtensionLocalStorage('accountNamesById', mergedAccountNamesById);
    }
  }
}

async function setMissingAdPopoverState() {
  const adPopoverState = await getExtensionLocalStorage('adPopoverState');

  if (adPopoverState) {
    AD_POPOVER_IDS.forEach(async (id) => {
      if (adPopoverState[id]) {
        const adPopoverStateItem = adPopoverState[id];

        if (adPopoverStateItem.isVisiable) {
          const newState = produce(adPopoverState, (draft) => {
            draft[id].isVisiable = false;
          });

          await setExtensionLocalStorage('adPopoverState', newState);
        }
      }

      if (!adPopoverState[id]) {
        const newState = produce(adPopoverState, (draft) => {
          draft[id] = {
            isVisiable: false,
          };
        });

        await setExtensionLocalStorage('adPopoverState', newState);
      }
    });
  }
}

async function setMissingPreferAccountType() {
  const storedPreferAccountType = await getExtensionLocalStorage('preferAccountType');
  const paramsV11 = await getExtensionLocalStorage('paramsV11');
  const userAccounts = await getExtensionLocalStorage('userAccounts');

  if (!storedPreferAccountType || (storedPreferAccountType && Object.keys(storedPreferAccountType).length < 1) || !paramsV11 || !userAccounts) {
    return;
  }

  const chainIds = Object.keys(paramsV11);
  const chainInfos = chainIds.map((chainId) => {
    const chainInfo = paramsV11[chainId];

    return {
      id: chainId,
      ...chainInfo,
    };
  });

  const filteredAccountTypes = chainInfos.filter((item) => item.params.chainlist_params?.account_type && item.params.chainlist_params.account_type.length > 1);

  const freshMultiAccountChainNames = filteredAccountTypes.map((item) => item.id);

  const notStoredNewMultiAccountChainName = freshMultiAccountChainNames
    .filter((item) => {
      const storedAccountTypeSample = Object.values(storedPreferAccountType)[0];

      const isNotStoredMultiAccountChainName = storedAccountTypeSample ? !Object.keys(storedAccountTypeSample).includes(item) : true;
      return isNotStoredMultiAccountChainName;
    })
    .filter((item) => !!item);

  if (notStoredNewMultiAccountChainName && notStoredNewMultiAccountChainName.length > 0) {
    const newPreferAccountType: ChainToAccountTypeMap = {};

    notStoredNewMultiAccountChainName.forEach((item) => {
      const newChainAccountType = filteredAccountTypes.find((ac) => ac.params.chainlist_params.api_name === item)?.params.chainlist_params.account_type;
      const defaultAccountType = newChainAccountType?.find((type) => type.is_default !== false);

      if (defaultAccountType) {
        const type = {
          hdPath: defaultAccountType.hd_path.replace('X', '${index}'),
          pubkeyStyle: defaultAccountType.pubkey_style,
          isDefault: defaultAccountType.is_default,
          pubkeyType: defaultAccountType.pubkey_type,
        };
        newPreferAccountType[item] = type;
      }
    });

    const updatedPreferAccountType = userAccounts.reduce((acc: PreferAccountType, cur) => {
      const oldPreferAccountType = storedPreferAccountType[cur.id];
      const mergedPreferAccountType = { ...oldPreferAccountType, ...newPreferAccountType };

      acc[cur.id] = mergedPreferAccountType;
      return acc;
    }, {});

    await setExtensionLocalStorage('preferAccountType', updatedPreferAccountType);
  }
}

async function initializePreferAccountType() {
  const storedPreferAccountType = await getExtensionLocalStorage('preferAccountType');
  const paramsV11 = await getExtensionLocalStorage('paramsV11');
  const userAccounts = await getExtensionLocalStorage('userAccounts');

  if (
    userAccounts &&
    userAccounts.length > 0 &&
    paramsV11 &&
    (!storedPreferAccountType || (storedPreferAccountType && Object.keys(storedPreferAccountType).length < 1))
  ) {
    const formattedMulitpleAccountTypesParams = Object.entries(paramsV11)
      .filter((item) => {
        const accountType = item[1].params.chainlist_params?.account_type;
        return accountType && accountType.length > 1;
      })
      .map((item) => {
        const v11Param = item[1];
        return {
          apiId: item[0],
          ...v11Param,
        };
      });

    const defaultPreferAccountType = formattedMulitpleAccountTypesParams.reduce((acc: ChainToAccountTypeMap, cur) => {
      const defaultAccountType = cur.params.chainlist_params.account_type?.find((type) => type.is_default !== false);

      if (defaultAccountType) {
        const type = {
          hdPath: defaultAccountType.hd_path.replace('X', '${index}'),
          pubkeyStyle: defaultAccountType.pubkey_style,
          isDefault: defaultAccountType.is_default,
          pubkeyType: defaultAccountType.pubkey_type,
        };

        acc[cur.apiId] = type;
      }

      return acc;
    }, {});

    const updatedPreferAccountType = userAccounts.reduce((acc: PreferAccountType, cur) => {
      acc[cur.id] = defaultPreferAccountType;
      return acc;
    }, {});

    await setExtensionLocalStorage('preferAccountType', updatedPreferAccountType);
  }
}
