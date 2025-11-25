import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter/index.tsx';
import { getKeypair } from '@/libs/address.ts';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Ed25519Keypair as MyStenEd25519Keypair } from '@mysten/sui/keypairs/ed25519';
import sendConfirmImage from '@/assets/images/etc/sendConfirm.png';
import OctChain from '@/assets/img/chains/oct.png';
import CopyIcon from '@/assets/img/icon/copy_primary.png';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'use-debounce';
import { useMemo, useState } from 'react';
import VerifyPasswordBottomSheet from '@/components/VerifyPasswordBottomSheet';
import { useGetAccountAsset } from '@/hooks/useGetAccountAsset.ts';
import { gt, toBaseDenomAmount } from '@/utils/numbers.ts';
import { signAndExecuteTxSequentially } from '@/utils/sui/sign.ts';
import { getUniqueChainIdWithManual, parseCoinId } from '@/utils/queryParamGenerator.ts';
import { getShortAddress } from '@/utils/string';
import { Transaction as TransactionOct, type Transaction as TransactionTypeOct } from '@onelabs/sui/transactions';
import { Transaction, type Transaction as TransactionType } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@onelabs/sui/utils';
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';
import type { ZkLoginAccount } from '@/types/account';
import { aesDecrypt } from '@/utils/crypto';
import type { PartialZkLoginSignature } from '@/utils/sui/zkloginService';
import { RPC_URL } from '@/utils/sui/zkloginService';
import type { IdTokenPayload } from '@/hooks/useZklogin';
import { getSuiClient, getSuiCoinType } from '@/onechain/utils';
// import { SUI_COIN_TYPE } from '@/constants/sui';
import { useGetCoins } from '@/hooks/sui/useGetCoins.ts';
import { useCurrentAccount } from '@/hooks/useCurrentAccount.ts';
import { useCurrentPassword } from '@/hooks/useCurrentPassword.ts';
import { useClipboard } from '@/hooks/useClipboard';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useTxTrackerStore } from '@/zustand/hooks/useTxTrackerStore.ts';
import { Route as TxResult } from '@/pages/wallet/tx-result';
import { toastDefault, toastError } from '@/utils/toast.tsx';
import { getCoinType } from '@/utils/sui/coin.ts';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets.ts';
import { ZKLOGIN_SUPPORTED_CHAIN_ID } from '@/constants/zklogin.ts';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';

type SuiProps = {
  coinId: string;
  sendAmount?: string;
  sendAmountPrice?: string;
  recipientAddress?: string;
  feeAmount?: string;
};

export default function Sui({ coinId, sendAmount, sendAmountPrice, recipientAddress, feeAmount }: SuiProps) {
  const isOct = coinId.includes('oct');
  const { copyToClipboard } = useClipboard();
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { history } = useRouter();
  const { addTx } = useTxTrackerStore();

  const { currentAccount } = useCurrentAccount();
  const { currentPassword } = useCurrentPassword();
  const { getSuiAccountAsset } = useGetAccountAsset({ coinId });
  const selectedCoinToSend = getSuiAccountAsset();
  const coinSymbol = selectedCoinToSend?.asset.symbol || getCoinType(selectedCoinToSend?.asset.id || '');
  const coinDecimal = selectedCoinToSend?.asset.decimals || 0;
  const address = selectedCoinToSend?.address.address || '';
  const currentCoinType = selectedCoinToSend?.asset.id || '';
  const sendBaseAmount = sendAmount ? toBaseDenomAmount(sendAmount, coinDecimal) : '0';
  const { data: ownedEqualCoins } = useGetCoins({ coinId, coinType: currentCoinType });

  const SUI_COIN_TYPE = getSuiCoinType(coinId);
  const { data: accountAsset } = useAccountAllAssets();
  console.log(accountAsset);
  console.log(SUI_COIN_TYPE);
  const selectedFeeAsset = accountAsset?.suiAccountAssets.find((item) => item.asset.id === SUI_COIN_TYPE)?.asset;
  const coinFeeSymbol = selectedFeeAsset?.symbol || '';
  const coinFeeImage = selectedFeeAsset?.image || '';


  const sendTx = useMemo<TransactionType | TransactionTypeOct | undefined>(() => {
    if (!gt(sendBaseAmount, '0') || !recipientAddress || !isValidSuiAddress(recipientAddress)) {
      return undefined;
    }
    const tx = isOct ? new TransactionOct() : new Transaction();

    tx.setSenderIfNotSet(address);

    const filteredOwnedEqualCoins =
      ownedEqualCoins
        ?.map((item) => item.result?.data)
        .filter((item) => !!item)
        .flat() || [];

    const [primaryCoin, ...mergeCoins] = filteredOwnedEqualCoins?.filter((coin) => coin.coinType === currentCoinType) || [];

    if (currentCoinType === SUI_COIN_TYPE) {
      // @ts-ignore
      const [coin] = tx.splitCoins(tx.gas, [sendBaseAmount]);

      tx.transferObjects([coin], recipientAddress);
    } else if (primaryCoin) {
      const primaryCoinInput = tx.object(primaryCoin.coinObjectId);
      if (mergeCoins.length) {
        tx.mergeCoins(
          primaryCoinInput,
          mergeCoins.map((coin) => tx.object(coin.coinObjectId)),
        );
      }
      // @ts-ignore
      const coin = tx.splitCoins(primaryCoinInput, [sendBaseAmount]);
      tx.transferObjects([coin], recipientAddress);
    }

    return tx;
  }, [SUI_COIN_TYPE, address, currentCoinType, isOct, ownedEqualCoins, recipientAddress, sendBaseAmount]);

  const [debouncedTx] = useDebounce(sendTx, 500);

  const { isSignatureEnabled } = useExtensionStorageStore((state) => state);

  const handleOnClickConfirm = () => {
    if (isSignatureEnabled) {
      setShowPasswordVerification(true);
    } else {
      executeTransaction();
    }
  };

  const handlePasswordVerified = () => {
    setShowPasswordVerification(false);
    executeTransaction();
  };

  const handlePasswordVerificationClose = () => {
    setShowPasswordVerification(false);
  };

  const executeTransaction = async () => {
    try {
      if (!selectedCoinToSend?.chain) {
        throw new Error('Chain not found');
      }

      if (!debouncedTx) {
        throw new Error('Transaction not found');
      }

      let response;

      // Check if this is a zklogin account
      if (currentAccount.type === 'ZKLOGIN') {
        // Handle zklogin transaction
        const zkLoginAccount = currentAccount as ZkLoginAccount;

        // Decrypt zklogin data
        if (!currentPassword) {
          throw new Error('Password is required for zklogin transaction');
        }

        const idToken = aesDecrypt(zkLoginAccount.encryptedIdToken, currentPassword);
        const userSalt = aesDecrypt(zkLoginAccount.encryptedUserSalt, currentPassword);
        const ephemeralKeyData = aesDecrypt(zkLoginAccount.encryptedEphemeralKey, currentPassword);
        const zkProofData = aesDecrypt(zkLoginAccount.encryptedZkProof, currentPassword);

        // Parse zkProof
        const partialZkLoginSignature: PartialZkLoginSignature = JSON.parse(zkProofData);
        const { maxEpoch } = zkLoginAccount;

        // Create ephemeral keypair from stored data
        const ephemeralKeyPair = MyStenEd25519Keypair.fromSecretKey(ephemeralKeyData);

        // Set sender address for zklogin transaction
        debouncedTx.setSender(zkLoginAccount.address);

        // Get client - use appropriate client based on transaction type
        const client = getSuiClient(isOct, RPC_URL[ZKLOGIN_SUPPORTED_CHAIN_ID]);

        // Sign transaction with ephemeral keypair
        const { bytes, signature: userSignature } = await debouncedTx.sign({
          // @ts-expect-error - client type compatibility issue between @mysten/sui and @onelabs/sui
          client,
          signer: ephemeralKeyPair,
        });

        // Decode JWT to get claims
        const decodedJwt = jwtDecode<IdTokenPayload>(idToken);

        // Generate addressSeed
        const addressSeed: string = genAddressSeed(
          BigInt(userSalt),
          'sub',
          decodedJwt.sub!,
          decodedJwt.aud as string,
        ).toString();

        // Generate zkLogin signature
        const zkLoginSignature = getZkLoginSignature({
          inputs: {
            ...partialZkLoginSignature,
            addressSeed,
          },
          maxEpoch,
          userSignature,
        });

        // Execute transaction
        response = await client.executeTransactionBlock({
          transactionBlock: bytes,
          signature: zkLoginSignature,
        });

      } else {
        // Handle regular mnemonic/private key accounts
        const keyPair = getKeypair(selectedCoinToSend.chain, currentAccount, currentPassword);
        const privateKey = Buffer.from(keyPair.privateKey, 'hex');

        const signer = Ed25519Keypair.fromSecretKey(privateKey);
        const rpcURLs = selectedCoinToSend?.chain.rpcUrls.map((item) => item.url) || [];

        if (!rpcURLs.length) {
          throw new Error('RPC URLs not found');
        }

        response = await signAndExecuteTxSequentially(signer, debouncedTx, rpcURLs);
      }

      if (!response) {
        throw new Error('Failed to send transaction');
      }

      const { chainId, chainType } = parseCoinId(coinId);
      const uniqueChainId = getUniqueChainIdWithManual(chainId, chainType);
      addTx({
        txHash: response.digest,
        chainId: uniqueChainId,
        address: selectedCoinToSend.address.address,
        addedAt: Date.now(),
        retryCount: 0,
      });

      navigate({
        to: TxResult.to,
        search: {
          address: recipientAddress,
          coinId,
          txHash: response.digest,
        },
      });
    } catch (error) {
      console.error('Transaction failed:', error);
      navigate({
        to: TxResult.to,
        search: {
          coinId,
        },
      });
    }
  };

  return (
    <>
      <BaseBody>
        <img src={sendConfirmImage} alt={t('pages.wallet.tx-confirm.entry.Sui.index.imageAlt')} className="mx-auto mt-[-14px] h-[100px]" />
        <div className="mt-[-14px] h-[24px] text-center text-[18px] leading-[24px] font-bold text-white">
          {t('pages.wallet.tx-confirm.entry.Sui.index.title')}
        </div>
        <div className="mt-[4px] h-[24px] text-center text-[24px] leading-[24px] font-bold text-white">
          -{sendAmount} {coinSymbol}
        </div>
        <div
          className="mt-[4px] h-[24px] text-center text-[14px] leading-[24px] text-white opacity-40"
        >
          {t('pages.wallet.tx-confirm.entry.Sui.index.approxAmount', { amount: sendAmountPrice })}
        </div>
        <div className="relative mt-[24px] h-[118px] overflow-hidden rounded-[12px] bg-[#1e2025] pr-[12px] pl-[12px]">
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="opacity-40 text-white">
              {t('pages.wallet.tx-confirm.entry.Sui.index.gasFee')}
            </div>
            <div className="flex items-center">
              <img src={coinFeeImage} alt="oct" className="mr-[4px] size-[20px]" />
              <span className="text-white">
                {feeAmount} {coinFeeSymbol}
              </span>
            </div>
          </div>
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="opacity-40 text-white">
              {t('pages.wallet.tx-confirm.entry.Sui.index.from')}
            </div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(address)}</span>
              <img
                src={CopyIcon}
                alt={t('pages.wallet.tx-confirm.entry.Sui.index.copyAlt')}
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => {
                  copyToClipboard(address);
                }}
              />
            </div>
          </div>
          <div className="mt-[12px] flex h-[24px] justify-between text-[14px] leading-[24px]">
            <div className="opacity-40 text-white">
              {t('pages.wallet.tx-confirm.entry.Sui.index.to')}
            </div>
            <div className="flex items-center">
              <span className="text-white">{getShortAddress(recipientAddress)}</span>
              <img
                src={CopyIcon}
                alt={t('pages.wallet.tx-confirm.entry.Sui.index.copyAlt')}
                className="ml-[4px] size-[12px] cursor-pointer"
                onClick={() => {
                  copyToClipboard(recipientAddress || '');
                }}
              />
            </div>
          </div>
        </div>
      </BaseBody>
      <BaseFooter>
        <div className="mt-[8px] mb-[46px] flex">
          <button
            className="w-[110px] h-[50px] rounded-[12px] bg-[#1e2025] !text-[18px] font-bold text-white hover:bg-[#2C3039]"
            onClick={() => {
              history.back();
            }}
          >
            {t('pages.wallet.tx-confirm.entry.cancel')}
          </button>
          <button
            className="!ml-3 w-[190px] h-[50px] rounded-[12px] bg-[#0047c4] !text-[18px] font-bold text-white hover:bg-[#3B82FF]"
            onClick={handleOnClickConfirm}
          >
            {t('pages.wallet.tx-confirm.entry.confirm')}
          </button>
        </div>
      </BaseFooter>
      <VerifyPasswordBottomSheet
        open={showPasswordVerification}
        onClose={handlePasswordVerificationClose}
        onSubmit={handlePasswordVerified}
      />
    </>
  );
}
