import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { isValidSuiAddress } from '@mysten/sui/utils';
import BaseBody from '@/components/BaseLayout/components/BaseBody';
import { useVoucherCreate } from '@/hooks/sui/useVoucherCreate';
import { useVoucherRedeem } from '@/hooks/sui/useVoucherRedeem';
import { useVoucher } from '@/zustand/hooks/useVoucher';
import { useVoucherSigner } from '@/hooks/sui/useVoucherSigner';
import { useGroupAccountAssets } from '@/hooks/useGroupAccountAssets';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import {
  VOUCHER_COIN_TYPES,
  VOUCHER_DENOMINATIONS,
  getVoucherRpcUrl,
  getSupportedCurrencies,
  parseVoucherCode,
} from '@/constants/voucher';
import {
  fetchPrivacyPoolConfig,
  calculatePoolFee,
  type PrivacyPoolOnChainConfig,
} from '@/libs/privacyPool/config';
import { toastError, toastSuccess } from '@/utils/toast';
import { getCoinId } from '@/utils/queryParamGenerator';
import { getSuiClient } from '@/onechain/utils';
import VoucherList from '@/pages/onetransfer/Voucher/VoucherList';
import ActionButton from '@/pages/onetransfer/Voucher/ActionButton';
import RedeemInput from '@/pages/onetransfer/Voucher/RedeemInput';
import ReceiverInput from '@/pages/onetransfer/RedPacket/ReceiverInput';
import AmountInput from '@/pages/onetransfer/RedPacket/AmountInput';
import TokenSelector from '@/pages/onetransfer/RedPacket/TokenSelector';
import MainTabs from '@/pages/onetransfer/RedPacket/MainTabs';
import SubTabs from '@/pages/onetransfer/RedPacket/SubTabs';
import {
  computeCommitment as computePedersenCommitment,
  computeNullifierHash as computePedersenNullifierHash,
} from '@/utils/crypto/pedersen';
import type { AccountSuiAsset } from '@/types/account';
import type { Voucher } from '@/types/voucher';
import { VoucherClient } from '@/libs/voucher/client';
import { useCurrentAccountAddresses } from '@/hooks/useCurrentAccountAddresses.ts';

const ENABLE_DEBUG_LOGS = false;
const debugLog = (...args: unknown[]): void => {
  if (!ENABLE_DEBUG_LOGS) {
    return;
  }
  console.log(...args);
};

const MAIN_TABS = {
  VOUCHER: 0,
  RED_PACKET: 1,
} as const;

type MainTab = typeof MAIN_TABS[keyof typeof MAIN_TABS];

/**
 * 查询可用的 Coin 对象
 */
async function fetchCoins(address: string, coinType: string, network: 'oct' | 'oct-testnet'): Promise<any[]> {
  try {
    // 获取 RPC URL 并创建 client
    const rpcUrl = getVoucherRpcUrl(network);
    const client = getSuiClient(true, rpcUrl); // true 表示使用 OCT 链

    const allCoins: any[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const response: any = await client.getCoins({
        owner: address,
        coinType,
        cursor,
      });

      allCoins.push(...response.data);
      hasNextPage = response.hasNextPage;
      cursor = response.nextCursor ?? null;
    }

    return allCoins;
  } catch (error) {
    console.error('Failed to fetch coins:', error);
    return [];
  }
}

export default function OneTransferEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Voucher hooks
  const { chainId, signer } = useVoucherSigner();
  const network = chainId.startsWith('oct-testnet') ? 'oct-testnet' : 'oct';
  const voucherClient = useMemo(() => new VoucherClient(network), [network]);
  const { createVoucher, isCreating } = useVoucherCreate();
  const { redeemVoucher, isRedeeming, isGeneratingProof } = useVoucherRedeem();
  const {
    issuedVouchers,
    redeemedVouchers,
    addIssuedVoucher,
    addRedeemedVoucher,
    updateIssuedVoucher,
  } = useVoucher();
  const { currentAccount } = useCurrentAccount();
  const { data: addresses } = useCurrentAccountAddresses(
    currentAccount?.id ? { accountId: currentAccount.id } : {},
  );
  const [poolConfig, setPoolConfig] = useState<PrivacyPoolOnChainConfig | null>(null);
  const [isPoolConfigLoading, setIsPoolConfigLoading] = useState(false);
  const withdrawFee = useMemo(() => {
    if (!poolConfig) {
      return null;
    }
    return calculatePoolFee(
      poolConfig.noteDenomination,
      poolConfig.withdrawFixedFee,
      poolConfig.withdrawFeeBps,
    );
  }, [poolConfig]);

  const checkAlreadyRedeemedOnChain = async (voucherCode: string): Promise<boolean> => {
    if (!signer) {
      toastError(t('pages.onetransfer.errors.voucherErrors.signerNotAvailable'));
      return true;
    }

    try {
      const alreadyRedeemed = await voucherClient.isVoucherRedeemedOnChain(voucherCode, signer as any);
      if (alreadyRedeemed) {
        toastError(t('pages.onetransfer.errors.voucherErrors.voucherAlreadyRedeemed'));
      }
      return alreadyRedeemed;
    } catch (error) {
      const message = (error as Error)?.message || 'Unknown error';
      toastError(t('pages.onetransfer.errors.operationFailed', { message }));
      return true;
    }
  };

  const currentAccountAddress = useMemo(() => {
    if (!addresses) {
      return '';
    }
    const match = addresses.find((item) => item.chainId === network);
    if (match?.address) {
      return match.address;
    }
    const suiAddress = addresses.find((item) => item.chainType === 'sui');
    return suiAddress?.address ?? '';
  }, [addresses, network]);

  const issuedVouchersForCurrentAccount = useMemo(() => {
    if (!currentAccountAddress) {
      return [];
    }
    return issuedVouchers.filter((voucher) => voucher.accountAddress === currentAccountAddress);
  }, [currentAccountAddress, issuedVouchers]);

  const redeemedVouchersForCurrentAccount = useMemo(() => {
    if (!currentAccountAddress) {
      return [];
    }
    return redeemedVouchers.filter((voucher) => voucher.accountAddress === currentAccountAddress);
  }, [currentAccountAddress, redeemedVouchers]);

  useEffect(() => {
    let cancelled = false;
    setIsPoolConfigLoading(true);
    fetchPrivacyPoolConfig(network)
      .then((config) => {
        if (!cancelled) {
          setPoolConfig(config);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load privacy pool config:', error);
          setPoolConfig(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPoolConfigLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [network]);

  // 获取所有账户资产
  const { groupAccountAssets, isLoading: isGroupAssetsLoading } = useGroupAccountAssets();

  // 支持的币种 symbol 列表（从集中配置获取）
  const SUPPORTED_SYMBOLS = useMemo(() => {
    return getSupportedCurrencies(network);
  }, [network]);

  // 从 groupAccountAssets 中过滤出 OCT 链的资产
  const octAssets = useMemo(() => {
    const allAssets = [
      ...(groupAccountAssets?.singleAccountAssets || []),
      ...(groupAccountAssets?.groupAccountAssets || []),
    ];

    return allAssets.filter((item) => {
      // 必须是 sui 链类型
      if (item.chain.chainType !== 'sui') return false;

      // 检查链 ID 是否以 'oct' 开头
      const chainId = item.chain.id;
      const isOctChain = chainId.startsWith('oct');

      // 检查币种是否在支持列表中
      const isSupportedSymbol = SUPPORTED_SYMBOLS.includes(item.asset.symbol);

      return isOctChain && isSupportedSymbol;
    }) as AccountSuiAsset[];
  }, [SUPPORTED_SYMBOLS, groupAccountAssets?.groupAccountAssets, groupAccountAssets?.singleAccountAssets]);

  // 构造可用资产列表（用于下拉框）
  const availableAssets = useMemo(() => {
    // 根据当前网络过滤资产
    const currentNetworkAssets = octAssets.filter((asset) => {
      const assetChainId = asset.chain.id;
      const assetNetwork = assetChainId.startsWith('oct-testnet') ? 'oct-testnet' : 'oct';
      return assetNetwork === network;
    });

    // 去重并合并相同币种的资产
    const assetMap = new Map<string, AccountSuiAsset>();
    currentNetworkAssets.forEach((asset) => {
      const existing = assetMap.get(asset.asset.symbol);
      if (!existing) {
        assetMap.set(asset.asset.symbol, asset);
      } else {
        // 如果有重复，选择余额较大的
        const existingBalance = parseInt(existing.totalBalance || existing.balance, 10);
        const currentBalance = parseInt(asset.totalBalance || asset.balance, 10);
        if (currentBalance > existingBalance) {
          assetMap.set(asset.asset.symbol, asset);
        }
      }
    });

    // 确保 SUPPORTED_SYMBOLS 中的所有 token 都存在，即使余额为 0
    SUPPORTED_SYMBOLS.forEach((symbol) => {
      if (!assetMap.has(symbol)) {
        // 获取 token 的 coinType
        const coinType = VOUCHER_COIN_TYPES[network]?.[symbol as keyof typeof VOUCHER_COIN_TYPES[typeof network]];

        if (coinType) {
          // 从 VOUCHER_DENOMINATIONS 推断 decimals
          const denominations = VOUCHER_DENOMINATIONS[network]?.[symbol as keyof typeof VOUCHER_DENOMINATIONS[typeof network]];
          let decimals = 9; // 默认 9
          if (denominations) {
            // 通过 '1' 的值反推 decimals (1 * 10^decimals)
            const oneTokenValue = (denominations as any)['1'];
            decimals = oneTokenValue ? Math.log10(oneTokenValue) : 9;
          }

          // 使用第一个存在的资产作为模板，或创建默认值
          const templateAsset = currentNetworkAssets[0];

          // 创建占位 asset 对象
          const placeholderAsset: AccountSuiAsset = templateAsset ? {
            ...templateAsset,
            asset: {
              ...templateAsset.asset,
              symbol,
              id: coinType,
              decimals,
              chainId: network,
            },
            balance: '0',
            totalBalance: '0',
          } : {
            asset: {
              symbol,
              id: coinType,
              decimals,
              chainId: network,
              chainType: 'sui',
            },
            balance: '0',
            totalBalance: '0',
            address: {
              address: '', // 没有实际资产时使用空地址
              type: 'sui',
            },
            chain: {
              id: network,
              chainType: 'sui',
            },
          } as unknown as AccountSuiAsset;

          assetMap.set(symbol, placeholderAsset);
        }
      }
    });

    return Array.from(assetMap.values());
  }, [SUPPORTED_SYMBOLS, octAssets, network]);

  // 币种状态
  const [currency, setCurrency] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AccountSuiAsset | null>(null);

  const tokenOptions = useMemo(() => {
    return availableAssets.map((accountAsset) => ({
      value: accountAsset.asset.symbol,
      label: accountAsset.asset.symbol,
    }));
  }, [availableAssets]);

  // 当资产加载完成时，设置默认币种
  useEffect(() => {
    if (availableAssets.length > 0 && !currency) {
      const defaultAsset = availableAssets[0];
      setCurrency(defaultAsset.asset.symbol);
      setSelectedAsset(defaultAsset);
    }
  }, [availableAssets, currency]);

  // 当币种变化时，更新 selectedAsset
  useEffect(() => {
    const accountAsset = availableAssets.find(a => a.asset.symbol === currency);
    if (accountAsset) {
      setSelectedAsset(accountAsset);
    }
  }, [currency, availableAssets]);

  // 构造 coinId 和 coinType
  const coinType = selectedAsset?.asset.id || '0x2::oct::OCT';

  // OCT 和 OCT-testnet 链使用 Sui 基础设施，所以 coinId 需要使用 'sui' 作为 chainId
  const coinId = selectedAsset ? (() => {
    const asset = selectedAsset.asset;
    // 如果是 oct 或 oct-testnet 链，统一映射到 sui chainId
    if (asset.chainId === 'oct' || asset.chainId === 'oct-testnet') {
      return `${asset.id}__sui__${asset.chainType}`;
    }
    return getCoinId(asset);
  })() : `${coinType}__sui__sui`;

  debugLog('🔍 OneTransfer coinId debug:', {
    coinId,
    coinType,
    network,
    selectedAsset,
    assetChainId: selectedAsset?.asset.chainId,
    assetChainType: selectedAsset?.asset.chainType,
  });

  const formattedBalance = useMemo(() => {
    if (!selectedAsset) {
      return '--';
    }

    const rawBalance = parseInt(selectedAsset.totalBalance ?? selectedAsset.balance, 10);
    const decimals = selectedAsset.asset.decimals ?? 9;
    const balance = rawBalance / Math.pow(10, decimals);

    return balance.toFixed(6).replace(/\.?0+$/, '');
  }, [selectedAsset]);

  const balanceText = t('pages.onetransfer.labels.balance', {
    value: formattedBalance,
    symbol: selectedAsset?.asset.symbol ?? '',
  });

  // 主标签状态：0-支票，1-红包
  const [mainTab, setMainTab] = useState<MainTab>(MAIN_TABS.VOUCHER);
  // 子标签状态：0-开支票，1-兑换（仅在支票标签下使用）
  const [subTab, setSubTab] = useState(0);

  // 表单状态
  const [amount, setAmount] = useState('1'); // 默认 1
  const [receiver, setReceiver] = useState('');
  const [exchangeCode, setExchangeCode] = useState('');

  // 加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 错误状态
  const [errors, setErrors] = useState<{
    amount?: string;
    receiver?: string;
    exchangeCode?: string;
  }>({});

  // 实际数据
  // 支持的金额选项（从配置中获取）
  const currencyDenominations = useMemo(() => {
    if (poolConfig) {
      const decimals = selectedAsset?.asset.decimals ?? 9;
      const noteValue = Number(poolConfig.noteDenomination);
      const displayValue = (noteValue / Math.pow(10, decimals)).toString();
      return { [displayValue]: noteValue };
    }

    const networkDenominations = VOUCHER_DENOMINATIONS[network] || {};
    return (networkDenominations as any)[currency] || {};
  }, [currency, network, poolConfig, selectedAsset?.asset.decimals]);
  const denominationOptions = useMemo(() => {
    return Object.keys(currencyDenominations).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [currencyDenominations]);

  // 验证逻辑：计算按钮是否应该禁用和错误消息
  const buttonValidation = useMemo(() => {
    // 默认不禁用，无错误消息
    let isButtonDisabled = false;
    let errorMessage = '';

    // 如果正在加载，禁用按钮
    if (isLoading || (mainTab === MAIN_TABS.VOUCHER && isPoolConfigLoading)) {
      isButtonDisabled = true;
      return { isButtonDisabled, errorMessage };
    }

    // 获取当前余额（原始单位）
    const rawBalance = selectedAsset ? parseInt(selectedAsset.totalBalance ?? selectedAsset.balance, 10) : 0;
    const decimals = selectedAsset?.asset.decimals ?? 9;

    // 获取选中金额对应的原始值
    const denomination = (currencyDenominations as Record<string, number>)[amount];

    const dynamicFee = poolConfig
      ? Number(
        calculatePoolFee(
          poolConfig.noteDenomination,
          poolConfig.depositFixedFee,
          poolConfig.depositFeeBps,
        ),
      )
      : Math.ceil(denomination ? denomination * 0.001 : 0); // fallback to 0.1% if config 未加载
    const totalAmountWithFee = denomination ? denomination + dynamicFee : 0;

    if (mainTab === MAIN_TABS.VOUCHER) {
      if (subTab === 0) {
        if (!poolConfig) {
          isButtonDisabled = true;
          return { isButtonDisabled, errorMessage };
        }
        // 支票功能 - 开支票
        if (totalAmountWithFee > rawBalance) {
          isButtonDisabled = true;
          const required = totalAmountWithFee / Math.pow(10, decimals);
          const available = rawBalance / Math.pow(10, decimals);
          errorMessage = t('pages.onetransfer.errors.insufficientBalance');
        }
      } else if (subTab === 1) {
        if (!poolConfig || withdrawFee === null) {
          isButtonDisabled = true;
          return { isButtonDisabled, errorMessage };
        }

        if (!exchangeCode.trim()) {
          isButtonDisabled = true;
        }
      }
    } else {
      if (totalAmountWithFee > rawBalance) {
        isButtonDisabled = true;
        const required = totalAmountWithFee / Math.pow(10, decimals);
        const available = rawBalance / Math.pow(10, decimals);
        errorMessage = t('pages.onetransfer.errors.insufficientBalance', {
          required,
          available,
          currency,
        });
      }

      const trimmedReceiver = receiver.trim();
      if (!trimmedReceiver || !isValidSuiAddress(trimmedReceiver)) {
        isButtonDisabled = true;
      }
    }

    return { isButtonDisabled, errorMessage };
  }, [
    isLoading,
    mainTab,
    subTab,
    amount,
    exchangeCode,
    receiver,
    selectedAsset,
    currencyDenominations,
    currency,
    t,
    poolConfig,
    isPoolConfigLoading,
    withdrawFee,
  ]);

  const issuedVoucherList = useMemo(() => {
    return [...issuedVouchersForCurrentAccount]
      .sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0));
  }, [issuedVouchersForCurrentAccount]);

  const redeemedVoucherList = useMemo(() => {
    return [...redeemedVouchersForCurrentAccount]
      .sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0));
  }, [redeemedVouchersForCurrentAccount]);

  // 当币种或网络变化时，自动调整金额为第一个可用选项
  useEffect(() => {
    if (denominationOptions.length > 0 && !denominationOptions.includes(amount)) {
      setAmount(denominationOptions[0]);
    }
  }, [currency, network, denominationOptions, amount]);

  // 表单验证
  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (mainTab === MAIN_TABS.VOUCHER) {
      if (subTab === 0) {
        // 开支票需要验证金额
        if (!amount || parseFloat(amount) <= 0) {
          newErrors.amount = t('pages.onetransfer.errors.invalidAmount');
        }
      }

      if (subTab === 1) {
        // 兑换需要验证兑换码
        if (!exchangeCode.trim()) {
          newErrors.exchangeCode = t('pages.onetransfer.errors.invalidVoucherCode');
        }
      }
    } else {
      if (!amount || parseFloat(amount) <= 0) {
        newErrors.amount = t('pages.onetransfer.errors.invalidAmount');
      }

      const trimmedReceiver = receiver.trim();
      if (!trimmedReceiver || !isValidSuiAddress(trimmedReceiver)) {
        newErrors.receiver = t('pages.onetransfer.errors.invalidAddress');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createVoucherForCurrentSelection = async (): Promise<{ voucher: Voucher; denomination: number } | null> => {
    if (!selectedAsset) {
      toastError(t('pages.onetransfer.errors.noCurrencySelected'));
      return null;
    }

    if (!poolConfig) {
      toastError(t('pages.onetransfer.errors.operationFailed', { message: 'Privacy pool config not ready' }));
      return null;
    }

    const voucherAccountAddress = currentAccountAddress || selectedAsset.address.address;
    if (!voucherAccountAddress) {
      console.error('Current account address unavailable. Please try again.');
      toastError(t('pages.onetransfer.errors.recipientUnavailable'));
      return null;
    }

    const denominationMap = currencyDenominations as Record<string, number>;
    const denomination = denominationMap[amount];

    if (!denomination) {
      toastError(t('pages.onetransfer.errors.amountNotSupported', { amount, currency }));
      return null;
    }

    const depositFee = Number(
      calculatePoolFee(
        poolConfig.noteDenomination,
        poolConfig.depositFixedFee,
        poolConfig.depositFeeBps,
      ),
    );
    const totalRequired = denomination + depositFee;

    const decimals = selectedAsset.asset.decimals ?? 9;
    const divisor = Math.pow(10, decimals);
    const balanceInRaw = parseInt(selectedAsset.totalBalance ?? selectedAsset.balance, 10);

    if (balanceInRaw < totalRequired) {
      const required = totalRequired / divisor;
      const available = balanceInRaw / divisor;
      toastError(
        t('pages.onetransfer.errors.insufficientBalance', {
          required,
          available,
          currency,
        }),
      );
      return null;
    }

    const coinType = selectedAsset.asset.id;
    const coins = await fetchCoins(selectedAsset.address.address, coinType, network);

    if (!coins || coins.length === 0) {
      toastError(t('pages.onetransfer.errors.noCoinObjects'));
      return null;
    }

    const sortedCoins = coins.sort((a, b) => parseInt(b.balance) - parseInt(a.balance));

    let totalSelected = 0;
    const selectedCoins: any[] = [];
    const MAX_COINS = 2048; // Sui 区块链交易对象数量限制

    for (const coin of sortedCoins) {
      selectedCoins.push(coin);
      totalSelected += parseInt(coin.balance);

      if (totalSelected >= totalRequired) {
        break;
      }

      if (selectedCoins.length >= MAX_COINS) {
        break;
      }
    }

    if (totalSelected < totalRequired) {
      const required = totalRequired / divisor;
      const available = totalSelected / divisor;
      toastError(
        t('pages.onetransfer.errors.insufficientBalance', {
          required,
          available,
          currency,
        }),
      );
      return null;
    }

    if (selectedCoins.length >= MAX_COINS && totalSelected < totalRequired) {
      toastError(t('pages.onetransfer.errors.tooManyCoins', { max: MAX_COINS }));
      return null;
    }

    const coinIds = selectedCoins.map((coin: any) => coin.coinObjectId);

    debugLog(
      `已选择 ${coinIds.length} 个 Coin 对象，总额: ${totalSelected / divisor} ${currency}, 需支付(含费): ${totalRequired / divisor}`,
    );

    const voucher = await createVoucher({
      currency,
      amount: denomination,
      coinIds,
    });

    if (!voucher) {
      return null;
    }

    const recordedAt = voucher.timestamp ?? Date.now();
    const voucherWithAccount = { ...voucher, accountAddress: voucherAccountAddress, timestamp: recordedAt };
    addIssuedVoucher(voucherWithAccount);
    console.log('支票码:', voucher.voucherCode);

    return { voucher: voucherWithAccount, denomination };
  };

  // 处理表单提交
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      if (mainTab === MAIN_TABS.VOUCHER) {
        if (subTab === 0) {
          if (!poolConfig) {
            toastError(t('pages.onetransfer.errors.operationFailed', { message: 'Privacy pool config not ready' }));
            return;
          }
          debugLog('开支票:', { currency, amount });
          const creationResult = await createVoucherForCurrentSelection();
          if (!creationResult) {
            return;
          }
        } else {
          if (!poolConfig || withdrawFee === null) {
            toastError(t('pages.onetransfer.errors.operationFailed', { message: 'Privacy pool config not ready' }));
            return;
          }
          // 兑换支票
          debugLog('兑换支票:', { exchangeCode, receiver });

          const recipientAddress = receiver || currentAccountAddress;

          if (!recipientAddress) {
            toastError(t('pages.onetransfer.errors.recipientUnavailable'));
            return;
          }

          const alreadyRedeemed = await checkAlreadyRedeemedOnChain(exchangeCode);
          if (alreadyRedeemed) {
            return;
          }

          const result = await redeemVoucher({
            voucherCode: exchangeCode,
            recipient: recipientAddress,
          });

          if (result.success && result.digest) {
            const voucher = issuedVouchersForCurrentAccount.find((v) => v.voucherCode === exchangeCode);
            if (voucher) {
              const redeemedEntry: Voucher = {
                ...voucher,
                id: `${voucher.id}-redeemed-${Date.now()}`,
                accountAddress: recipientAddress,
                redeemed: true,
                redeemTxDigest: result.digest,
                redeemTime: Date.now(),
              };
              updateIssuedVoucher(voucher.id, { redeemTxDigest: result.digest, redeemTime: Date.now() });
              addRedeemedVoucher(redeemedEntry);
            } else {
              const parsed = parseVoucherCode(exchangeCode);
              const denomination = result.amount ?? parsed?.amount ?? 0;
              const readableAmount = denomination
                ? `${denomination / 1e9} ${currency}`
                : `0 ${currency}`;
              const timestamp = Date.now();
              const nullifierHex = parsed
                ? `0x${parsed.nullifier.toString(16).padStart(64, '0')}`
                : '0x0';
              const secretHex = parsed
                ? `0x${parsed.secret.toString(16).padStart(64, '0')}`
                : '0x0';
              const commitmentHex = parsed
                ? computePedersenCommitment(parsed.nullifier, parsed.secret)
                : '0x0';
              const nullifierHashHex = parsed
                ? computePedersenNullifierHash(parsed.nullifier)
                : '0x0';

              addRedeemedVoucher({
                id: `${exchangeCode}-${timestamp}`,
                accountAddress: recipientAddress,
                network,
                currency,
                amount: readableAmount,
                denomination,
                commitment: commitmentHex,
                nullifier: nullifierHex,
                secret: secretHex,
                nullifierHash: nullifierHashHex,
                leafIndex: parsed?.leafIndex ?? -1,
                timestamp,
                voucherCode: exchangeCode,
                redeemed: true,
                redeemTxDigest: result.digest,
                redeemTime: Date.now(),
              });
            }

            const redeemedAmount = result.amount ? result.amount / 1e9 : '?';
            toastSuccess(t('pages.onetransfer.toasts.redeemSuccess', { amount: redeemedAmount, currency }));
            debugLog('交易哈希:', result.digest);

            setExchangeCode('');
            setReceiver('');
          }
        }
      } else {
        debugLog('发送红包:', { currency, amount, receiver });
        const creationResult = await createVoucherForCurrentSelection();
        if (!creationResult) {
          return;
        }

        const { voucher, denomination } = creationResult;
        const recipientAddress = receiver.trim();

        const alreadyRedeemed = await checkAlreadyRedeemedOnChain(voucher.voucherCode);
        if (alreadyRedeemed) {
          return;
        }

        const result = await redeemVoucher({
          voucherCode: voucher.voucherCode,
          recipient: recipientAddress,
        });

        if (result.success && result.digest) {
          const redeemedEntry: Voucher = {
            ...voucher,
            id: `${voucher.id}-redeemed-${Date.now()}`,
            accountAddress: recipientAddress,
            redeemed: true,
            redeemTxDigest: result.digest,
            redeemTime: Date.now(),
          };
          updateIssuedVoucher(voucher.id, { redeemTxDigest: result.digest, redeemTime: Date.now() });
          addRedeemedVoucher(redeemedEntry);
          const decimals = selectedAsset?.asset.decimals ?? 9;
          const readableAmount = denomination / Math.pow(10, decimals);
          toastSuccess(t('pages.onetransfer.toasts.redPacketSuccess', { amount: readableAmount, currency }));
          debugLog('红包交易哈希:', result.digest);
          setReceiver('');
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
      toastError(t('pages.onetransfer.errors.operationFailed', { message: (error as Error).message }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMainTabChange = (tab: MainTab) => {
    setMainTab(tab);
    setErrors({});
    if (tab === MAIN_TABS.VOUCHER) {
      setSubTab(0);
    }
  };

  const mainTabItems = useMemo<{ key: MainTab; label: string }[]>(
    () => [
      { key: MAIN_TABS.VOUCHER as MainTab, label: t('pages.onetransfer.mainTabs.voucher') },
      // 隐藏红包
      // { key: MAIN_TABS.RED_PACKET as MainTab, label: t('pages.onetransfer.mainTabs.redPacket') },
    ],
    [t],
  );

  const subTabItems = useMemo(
    () => [
      { key: 0, label: t('pages.onetransfer.tabs.issue') },
      { key: 1, label: t('pages.onetransfer.tabs.redeem') },
    ],
    [t],
  );

  const handleSubTabChange = (tab: number) => {
    setSubTab(tab);
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleExchangeCodeChange = (value: string) => {
    setExchangeCode(value);
    if (errors.exchangeCode) {
      setErrors(prev => ({ ...prev, exchangeCode: undefined }));
    }
  };

  const handleReceiverChange = (value: string) => {
    setReceiver(value);
    if (errors.receiver) {
      setErrors(prev => ({ ...prev, receiver: undefined }));
    }
  };

  const { isButtonDisabled, errorMessage } = buttonValidation;
  const isVoucherTab = mainTab === MAIN_TABS.VOUCHER;
  const buttonText = isVoucherTab
    ? (subTab === 0
      ? t('pages.onetransfer.tabs.issue')
      : t('pages.onetransfer.tabs.redeem'))
    : t('pages.onetransfer.buttons.sendRedPacket');
  const loadingText = t('pages.onetransfer.messages.processing');
  const isBusy = isLoading || isCreating || isRedeeming || (isVoucherTab && isGeneratingProof);
  const showProofGenerating = isVoucherTab && subTab === 1 && isGeneratingProof;
  const proofGeneratingText = t('pages.onetransfer.messages.generatingProof');

  return (
    <BaseBody>
      {/*<div className="flex-1 bg-gray-900 text-white min-h-screen">*/}
      <div className="py-6">
        {/* 主标签 */}
        <MainTabs
          title={t('pages.onetransfer.title')}
          activeTab={mainTab}
          tabs={mainTabItems}
          onChange={handleMainTabChange}
        />

        {/* 红包页面 */}
        {mainTab === MAIN_TABS.VOUCHER && (
          <div>
            <SubTabs activeTab={subTab} tabs={subTabItems} onChange={handleSubTabChange} />

            {/* 开支票 */}
            {subTab === 0 && (
              <div>
                <TokenSelector
                  label={t('pages.onetransfer.fields.currency')}
                  value={currency}
                  options={tokenOptions}
                  disabled={isGroupAssetsLoading || availableAssets.length === 0}
                  balanceText={balanceText}
                  onChange={handleCurrencyChange}
                />
                <AmountInput
                  label={t('pages.onetransfer.fields.amount')}
                  value={amount}
                  options={denominationOptions}
                  errorMessage={errors.amount}
                  onChange={handleAmountChange}
                />
                <div className="text-gray-400 text-[16px] rounded-lg px-4 pt-3">
                  {t('pages.onetransfer.labels.issueFee', { fee: 0.1 })}
                </div>
                <div className="text-gray-400 text-[16px] mb-8 rounded-lg px-4 py-2">
                  {t('pages.onetransfer.labels.issueFee2', { currency })}
                </div>
                <ActionButton
                  buttonText={buttonText}
                  loadingText={loadingText}
                  isBusy={isBusy}
                  isButtonDisabled={isButtonDisabled}
                  errorMessage={errorMessage}
                  showProofGenerating={showProofGenerating}
                  proofGeneratingText={proofGeneratingText}
                  onClick={handleSubmit}
                />
                <VoucherList
                  title={t('pages.onetransfer.sections.issued')}
                  list={issuedVoucherList}
                  emptyText={t('pages.onetransfer.empty.issued')}
                  activeTab={'issued'}
                />
              </div>
            )}

            {/* 兑换 */}
            {subTab === 1 && (
              <div>
                <RedeemInput
                  value={exchangeCode}
                  placeholder={t('pages.onetransfer.placeholders.voucherCode')}
                  errorMessage={errors.exchangeCode}
                  onChange={handleExchangeCodeChange}
                />
                <div className="text-gray-400 text-[16px] mb-8 rounded-lg px-4 py-3">
                  {t('pages.onetransfer.labels.redeemFee', { currency })}
                </div>
                <ActionButton
                  buttonText={buttonText}
                  loadingText={loadingText}
                  isBusy={isBusy}
                  isButtonDisabled={isButtonDisabled}
                  errorMessage={''}
                  showProofGenerating={showProofGenerating}
                  proofGeneratingText={proofGeneratingText}
                  onClick={handleSubmit}
                />
                <VoucherList
                  title={t('pages.onetransfer.sections.redeemed')}
                  list={redeemedVoucherList}
                  emptyText={t('pages.onetransfer.empty.redeemed')}
                  activeTab={'redeemed'}
                />
              </div>
            )}
          </div>
        )}

        {mainTab === MAIN_TABS.RED_PACKET && (
          <div>
            <TokenSelector
              label={t('pages.onetransfer.fields.currency')}
              value={currency}
              options={tokenOptions}
              disabled={isGroupAssetsLoading || availableAssets.length === 0}
              balanceText={balanceText}
              onChange={handleCurrencyChange}
            />
            <AmountInput
              label={t('pages.onetransfer.fields.amount')}
              value={amount}
              options={denominationOptions}
              errorMessage={errors.amount}
              onChange={handleAmountChange}
            />
            <ReceiverInput
              value={receiver}
              label={t('pages.onetransfer.fields.recipient')}
              placeholder={t('pages.onetransfer.placeholders.recipientAddress')}
              errorMessage={errors.receiver}
              invalidAddressMessage={t('pages.onetransfer.errors.invalidAddress')}
              serviceFeeText={t('pages.onetransfer.labels.serviceFee', { fee: 0.1 })}
              onChange={handleReceiverChange}
            />
            <ActionButton
              buttonText={buttonText}
              loadingText={loadingText}
              isBusy={isBusy}
              isButtonDisabled={isButtonDisabled}
              errorMessage={errorMessage}
              showProofGenerating={showProofGenerating}
              proofGeneratingText={proofGeneratingText}
              onClick={handleSubmit}
            />
          </div>
        )}
      </div>
      {/*</div>*/}
    </BaseBody>
  );
}
