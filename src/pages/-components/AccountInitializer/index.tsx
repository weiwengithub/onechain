import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { sendMessage } from '@/libs/extension';
import type { ExtensionStorage } from '@/types/extension';
import { devLogger } from '@/utils/devLogger';
import {
  loadExtensionStorageStoreFromStorage,
  useExtensionStorageStore,
} from '@/zustand/hooks/useExtensionStorageStore';
import { useLoadingOverlayStore } from '@/zustand/hooks/useLoadingOverlayStore';
import { ZKLOGIN_SUPPORTED_CHAIN_ID, ZKLOGIN_SUPPORTED_CHAIN_TYPE, ZKLOGIN_ACCOUNT_TYPE } from '@/constants/zklogin';

type AccountInitializerProps = {
  children: JSX.Element;
};

export default function AccountInitializer({ children }: AccountInitializerProps) {
  const { t } = useTranslation();

  const { currentAccount } = useCurrentAccount();
  const {
    mnemonicNamesByHashedMnemonic: storedMnemonicNames,
    updateExtensionStorageStore,
  } = useExtensionStorageStore((state) => state);

  const { startLoadingOverlay, stopLoadingOverlay } = useLoadingOverlayStore((state) => state);
  const { refetch: refetchAccountAssets } = useAccountAllAssets();

  useEffect(() => {
    const initializeAccountData = async () => {
      const currentAccountId = currentAccount?.id;
      if (!currentAccountId) return;

      const storage = await chrome.storage.local.get<ExtensionStorage>([
        `${currentAccountId}-address`,
        `${currentAccountId}-balance-cosmos`,
        `${currentAccountId}-balance-evm`,
        `${currentAccountId}-balance-bitcoin`,
        'mnemonicNamesByHashedMnemonic',
      ]);
      const address = storage[`${currentAccountId}-address`];
      const cosmosBalances = storage[`${currentAccountId}-balance-cosmos`];
      const evmBalances = storage[`${currentAccountId}-balance-evm`];
      const bitcoinBalances = storage[`${currentAccountId}-balance-bitcoin`];
      const mnemonicNamesByHashedMnemonic = storage[`mnemonicNamesByHashedMnemonic`];

      const isNeedFetchBalance = !cosmosBalances && !evmBalances && !bitcoinBalances;
      const isNeedFetchAddres = !address;
      const isNeedAddNewMnemonicName = currentAccount.type === 'MNEMONIC' && !mnemonicNamesByHashedMnemonic[currentAccount.encryptedRestoreString];
      
      // 检查 ZkLogin 账户是否缺少地址数据
      const isZkLoginWithoutAddress = currentAccount.type === 'ZKLOGIN' && !address;

      if (isNeedFetchBalance || isNeedFetchAddres || isNeedAddNewMnemonicName || isZkLoginWithoutAddress) {
        try {
          startLoadingOverlay(
            t('pages.components.AccountInitializer.index.loadingOverlayTitle'),
            t('pages.components.AccountInitializer.index.loadingOverlayMessage'),
          );

          if (isNeedFetchBalance) {
            await sendMessage({ target: 'SERVICE_WORKER', method: 'updateDefaultBalance', params: [currentAccountId] });
          }

          if (isNeedFetchAddres) {
            await sendMessage({ target: 'SERVICE_WORKER', method: 'updateAddress', params: [currentAccountId] });
          }

          if (isNeedAddNewMnemonicName) {
            updateExtensionStorageStore('mnemonicNamesByHashedMnemonic', {
              ...storedMnemonicNames,
              [currentAccount.encryptedRestoreString]: `Mnemonic ${Object.keys(storedMnemonicNames).length + 1}`,
            });
          }
          
          // 修复 ZkLogin 账户的地址数据
          if (isZkLoginWithoutAddress) {
            try {
              // 从 localStorage 获取 ZkLogin 地址
              const zkLoginAddress = localStorage.getItem('zklogin_address');
              if (zkLoginAddress) {
                // 生成标准地址数据
                const standardAddress = {
                  chainId: ZKLOGIN_SUPPORTED_CHAIN_ID,
                  chainType: ZKLOGIN_SUPPORTED_CHAIN_TYPE,
                  address: zkLoginAddress,
                  publicKey: zkLoginAddress, // ZkLogin 使用地址作为 publicKey
                  accountType: ZKLOGIN_ACCOUNT_TYPE
                };
                
                // 存储到标准位置
                await chrome.storage.local.set({
                  [`${currentAccountId}-address`]: [standardAddress]
                });
                console.log('Fixed ZkLogin address data for existing account');
              }
            } catch (error) {
              console.error('Failed to fix ZkLogin address:', error);
            }
          }

          await loadExtensionStorageStoreFromStorage();

          await refetchAccountAssets();
        } catch (e) {
          devLogger.error(e);
        } finally {
          stopLoadingOverlay();
        }
      }
    };

    initializeAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount.id]);

  return <>{children}</>;
}
