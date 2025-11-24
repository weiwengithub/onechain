import { getAddress, getKeypair } from '@/libs/address';
import { getChains } from '@/libs/chain';
import type { ZkLoginAccount } from '@/types/account';

import { emitToWeb } from './message';
import { extensionLocalStorage, extensionSessionStorage } from './storage';
import { isZkLoginAccount } from './zklogin';

export async function emitChangedAddressEvent(newAccountId: string) {
  const { userAccounts, approvedOrigins } = await extensionLocalStorage();
  const { currentPassword } = await extensionSessionStorage();
  const chainList = await getChains();

  const currentAccount = userAccounts.find((item) => item.id === newAccountId);
  if (!currentAccount) {
    throw new Error('Account not found');
  }

  // 检查是否是 ZkLogin 账户
  const isZkLogin = isZkLoginAccount(currentAccount);

  let ethereumAddress: string;
  
  if (isZkLogin) {
    // ZkLogin 账户不支持 EVM 链，发送空地址
    ethereumAddress = '';
  } else {
    // 常规账户处理
    const evmChainForAddress = chainList?.evmChains?.[0];
    const ethereumKeyPair = getKeypair(evmChainForAddress!, currentAccount, currentPassword);
    ethereumAddress = getAddress(evmChainForAddress!, ethereumKeyPair?.publicKey);
  }

  const approvedAllOrigins = Array.from(new Set(approvedOrigins.map((item) => item.origin)));

  const currentAccountOrigins = Array.from(new Set(approvedOrigins.filter((item) => item.accountId === newAccountId).map((item) => item.origin)));
  const currentAccountNotOrigins = Array.from(new Set(approvedOrigins.filter((item) => item.accountId !== newAccountId).map((item) => item.origin)));

  // EVM 链事件
  const evmResult = ethereumAddress ? [ethereumAddress] : [];
  emitToWeb({ event: 'accountsChanged', chainType: 'evm', data: { result: evmResult } }, currentAccountOrigins);
  emitToWeb(
    { event: 'accountsChanged', chainType: 'evm', data: { result: [] } },
    currentAccountNotOrigins.filter((item) => !currentAccountOrigins.includes(item)),
  );

  // Cosmos 链事件
  emitToWeb({ event: 'accountChanged', chainType: 'cosmos', data: undefined }, approvedAllOrigins);

  // Aptos 链处理
  let aptosAddress: string;
  let aptosKeyPair: { privateKey: string; publicKey: string } | undefined;

  if (isZkLogin) {
    // ZkLogin 账户不支持 Aptos 链，发送空地址
    aptosAddress = '';
    aptosKeyPair = undefined;
  } else {
    // 常规账户处理
    const aptosChainForAddress = chainList.aptosChains?.[0];
    aptosKeyPair = getKeypair(aptosChainForAddress!, currentAccount, currentPassword);
    aptosAddress = getAddress(aptosChainForAddress!, aptosKeyPair?.publicKey);
  }

  // Aptos 链事件
  emitToWeb({ event: 'accountChange', chainType: 'aptos', data: { result: aptosAddress } }, currentAccountOrigins);
  emitToWeb(
    {
      event: 'accountChange',
      chainType: 'aptos',
      data: {
        result: {
          address: aptosAddress,
          publicKey: aptosKeyPair?.publicKey || '',
        },
      },
    },
    currentAccountNotOrigins.filter((item) => !currentAccountOrigins.includes(item)),
  );

  // Sui 链处理
  let suiAddress: string;

  if (isZkLogin) {
    // ZkLogin 账户支持 Sui 链，使用账户中存储的地址
    suiAddress = currentAccount.type === 'ZKLOGIN' ? (currentAccount as ZkLoginAccount).address : '';
  } else {
    // 常规账户处理
    const suiChainForAddress = chainList.suiChains?.[0];
    const suiKeyPair = getKeypair(suiChainForAddress!, currentAccount, currentPassword);
    suiAddress = getAddress(suiChainForAddress!, suiKeyPair?.publicKey);
  }

  // Sui 链事件
  emitToWeb({ event: 'accountChange', chainType: 'sui', data: { result: suiAddress } }, currentAccountOrigins);
  emitToWeb(
    { event: 'accountChange', chainType: 'sui', data: { result: '' } },
    currentAccountNotOrigins.filter((item) => !currentAccountOrigins.includes(item)),
  );

  // Iota 链处理
  let iotaAddress: string | undefined;

  if (isZkLogin) {
    // ZkLogin 账户不支持 Iota 链，设置为 undefined
    iotaAddress = undefined;
  } else {
    // 常规账户处理
    const iotaChainForAddress = chainList.iotaChains?.[0];
    const iotaKeyPair = iotaChainForAddress
      ? getKeypair(iotaChainForAddress, currentAccount, currentPassword)
      : undefined;
    iotaAddress = iotaKeyPair && iotaChainForAddress ? getAddress(iotaChainForAddress, iotaKeyPair?.publicKey) : undefined;
  }

  // Iota 链事件
  if (iotaAddress) {
    emitToWeb({ event: 'accountChange', chainType: 'iota', data: { result: iotaAddress } }, currentAccountOrigins);
    emitToWeb(
      { event: 'accountChange', chainType: 'iota', data: { result: '' } },
      currentAccountNotOrigins.filter((item) => !currentAccountOrigins.includes(item)),
    );
  }

  // Bitcoin 链处理
  let bitcoinAddress: string;

  if (isZkLogin) {
    // ZkLogin 账户不支持 Bitcoin 链，发送空地址
    bitcoinAddress = '';
  } else {
    // 常规账户处理
    const { currentBitcoinNetwork } = await extensionLocalStorage();
    const bitcoinKeyPair = getKeypair(currentBitcoinNetwork, currentAccount, currentPassword);
    bitcoinAddress = getAddress(currentBitcoinNetwork, bitcoinKeyPair?.publicKey);
  }

  // Bitcoin 链事件
  const bitcoinResult = bitcoinAddress ? [bitcoinAddress] : [];
  emitToWeb({ event: 'accountChanged', chainType: 'bitcoin', data: { result: bitcoinResult } }, currentAccountOrigins);
}
