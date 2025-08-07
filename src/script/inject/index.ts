import { registerWallet as registerAptosWallet } from '@aptos-labs/wallet-standard';
import { registerCosmosWallet } from '@cosmostation/wallets';
import { registerWallet as registerIotaWallet } from '@iota/wallet-standard';
import { registerWallet as registerSuiWallet } from '@mysten/wallet-standard';

import type { EventDetail } from '@/types/message';
import type { ComProvidersResponse } from '@/types/message/inject/common';

import { CosmostationAptos } from './aptos/provider/aptos';
import { CosmostationBitcoin } from './bitcoin/provider/bitcoin';
import { CosmostaionCommon } from './common/provider';
import { CosmostaionCosmos } from './cosmos/provider/cosmostation';
import { CosmostationKeplr } from './cosmos/provider/keplr';
import { cosmosWallet } from './cosmos/provider/wallets';
import { announceEip6963Provider } from './evm/provider/eip6963';
import { CosmostaionEthereum } from './evm/provider/evm';
import { CosmostationIota, IotaStandard } from './iota/provider/iota';
import { CosmostationSui, SuiStandard } from './sui/provider/sui';

if (!window.__onechainInjected__) {
  window.__onechainInjected__ = true;

  // 创建 OneChain 提供者实例
  const createOnechainProvider = () => ({
    version: __APP_VERSION__,
    common: CosmostaionCommon.getInstance(),
    cosmos: CosmostaionCosmos.getInstance(),
    ethereum: CosmostaionEthereum.getInstance(),
    bitcoin: CosmostationBitcoin.getInstance(),
    sui: CosmostationSui.getInstance(),
    aptos: CosmostationAptos.getInstance(),
    iota: CosmostationIota.getInstance(),
    providers: {
      keplr: CosmostationKeplr.getInstance(),
      metamask: CosmostaionEthereum.getInstance(),
    },
  });

  void (() => {
    if (typeof window === 'undefined') return;

    // 始终注入 onechain 命名空间
    if (!window.onechain) {
      window.onechain = createOnechainProvider();
      window.onechainWallet = CosmostationSui.getInstance();
    }

    // 智能处理 cosmostation 命名空间
    const handleCosmostationNamespace = () => {
      if (!window.cosmostation) {
        // 如果没有 cosmostation，直接引用 onechain（兼容性）
        window.cosmostation = window.onechain;
        window.cosmostationWallet = CosmostationSui.getInstance();
      } else {
        // 检查是否是我们自己注入的（通过 version 检查）
        const isOurProvider = window.cosmostation === window.onechain || 
                              window.cosmostation.version === __APP_VERSION__;
        
        if (!isOurProvider) {
          // 如果存在其他 cosmostation 钱包，保存并提供选择
          const originalCosmostation = window.cosmostation;
          
          // 创建钱包管理器
          window.__walletManager = {
            providers: {
              onechain: window.onechain,
              cosmostation_original: originalCosmostation,
            },
            current: 'cosmostation_original', // 默认使用原版
            setActive: (walletName: string) => {
              if (walletName === 'onechain') {
                window.cosmostation = window.onechain;
                if (window.__walletManager) window.__walletManager.current = 'onechain';
              } else if (walletName === 'cosmostation_original') {
                window.cosmostation = originalCosmostation;
                if (window.__walletManager) window.__walletManager.current = 'cosmostation_original';
              }
              
              // 触发切换事件
              window.dispatchEvent(new CustomEvent('wallet_provider_changed', {
                detail: { activeWallet: walletName, providers: window.__walletManager?.getAvailable() || [] }
              }));
              
              return true;
            },
            getAvailable: () => Object.keys(window.__walletManager?.providers || {}),
            getCurrent: () => window.__walletManager?.current || 'unknown',
          };
          
          // 保持原版 Cosmostation 为默认选择
          console.log('OneChain: Detected original Cosmostation wallet. OneChain available via window.onechain');
          console.log('Use window.__walletManager.setActive("onechain") to switch to OneChain');
          console.log('Use window.__walletManager.setActive("cosmostation_original") to switch back');
        }
      }
    };

    // 注册钱包标准
    registerIotaWallet(new IotaStandard());
    registerSuiWallet(new SuiStandard());
    registerCosmosWallet(cosmosWallet);
    registerAptosWallet(CosmostationAptos.getInstance());

    announceEip6963Provider();

    // 异步初始化
    void (async () => {
      const currentChainId = (await window.onechain.ethereum.request({ method: 'eth_chainId', params: [] })) as string;
      window.onechain.ethereum.chainId = currentChainId;
      window.onechain.ethereum.networkVersion = `${parseInt(currentChainId, 16)}`;

      window.onechain.ethereum.on('chainChanged', (chainId) => {
        window.onechain.ethereum.chainId = chainId as string;
        window.onechain.ethereum.networkVersion = `${parseInt(chainId as string, 16)}`;
      });

      const onechainEvent = new CustomEvent('onechain_keystorechange', { cancelable: true });
      const cosmostationEvent = new CustomEvent('cosmostation_keystorechange', { cancelable: true });

      const accountChangedHandler = (event: CustomEvent<EventDetail>) => {
        if (event?.type === 'accountChanged' && event.detail.chainType === 'cosmos') {
          window.dispatchEvent(onechainEvent);
          // 为兼容性也触发 cosmostation 事件
          if (window.cosmostation === window.onechain) {
            window.dispatchEvent(cosmostationEvent);
          }
        }
      };

      window.addEventListener('accountChanged', accountChangedHandler as EventListener);

      const providers = (await window.onechain.common.request({ method: 'com_providers' })) as ComProvidersResponse;

      if (providers.keplr && !window.keplr) {
        window.keplr = window.onechain.providers.keplr;

        window.getOfflineSigner = window.onechain.providers.keplr.getOfflineSigner;
        window.getOfflineSignerOnlyAmino = window.onechain.providers.keplr.getOfflineSignerOnlyAmino;
        window.getOfflineSignerAuto = window.onechain.providers.keplr.getOfflineSignerAuto;

        const keplrEvent = new CustomEvent('keplr_keystorechange', { cancelable: true });

        const handler = (event: CustomEvent<EventDetail>) => {
          if (event?.type === 'accountChanged' && event.detail.chainType === 'cosmos') {
            window.dispatchEvent(keplrEvent);
          }
        };

        window.addEventListener('accountChanged', handler as EventListener);
      }

      if (providers.metamask && !window.ethereum) {
        window.onechain.ethereum.isMetaMask = true;
        window.ethereum = window.onechain.providers.metamask;
      }
    })();

    // 延迟处理 cosmostation 命名空间，等待其他钱包加载
    setTimeout(handleCosmostationNamespace, 100);
  })();
}
