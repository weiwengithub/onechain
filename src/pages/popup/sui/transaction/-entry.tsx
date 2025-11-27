import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bcs } from '@onelabs/sui/bcs';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Transaction as TransactionOct } from '@onelabs/sui/transactions';
import { Transaction } from '@mysten/sui/transactions';
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';
import { Ed25519Keypair as MyStenEd25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { jwtDecode } from 'jwt-decode';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import Button from '@/components/common/Button';
import { FilledTab, FilledTabs } from '@/components/common/FilledTab';
import SplitButtonsLayout from '@/components/common/SplitButtonsLayout';
import Tooltip from '@/components/common/Tooltip';
import { RPC_ERROR, RPC_ERROR_MESSAGE } from '@/constants/error';
// import { SUI_COIN_TYPE } from '@/constants/sui';
import { useSiteIconURL } from '@/hooks/common/useSiteIconURL';
import { useCurrentRequestQueue } from '@/hooks/current/useCurrentRequestQueue';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork';
import { useDryRunTransaction } from '@/hooks/sui/useDryRunTransaction';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { getAddress, getKeypair } from '@/libs/address';
import type { ZkLoginAccount } from '@/types/account';
import { aesDecrypt } from '@/utils/crypto';
import type { IdTokenPayload } from '@/hooks/useZklogin';
import type { PartialZkLoginSignature } from '@/utils/sui/zkloginService';
import { RPC_URL } from '@/utils/sui/zkloginService';
import { sendMessage } from '@/libs/extension';
import BaseTxInfo from '@/pages/popup/-components/BaseTxInfo';
import DappInfo from '@/pages/popup/-components/DappInfo';
import RawTx from '@/pages/popup/-components/RawTx';
import type {
  SuiSignAndExecuteTransaction,
  SuiSignAndExecuteTransactionBlock,
  SuiSignTransaction,
  SuiSignTransactionBlock,
} from '@/types/message/inject/sui';
import { gt, minus, plus } from '@/utils/numbers';
import { getCoinId, isSameChain } from '@/utils/queryParamGenerator';
import { isEqualsIgnoringCase } from '@/utils/string';
import { signAndExecuteTxSequentially, signTxSequentially } from '@/utils/sui/sign';
import { getSiteTitle } from '@/utils/website';

import TxMessage from './-components/TxMessage';
import {
  Divider,
  // DividerContainer,
  // LineDivider,
  RawTxContainer,
  ScrollableStyledTabPanel,
  SticktFooterInnerBody,
  SuiStickyTabContainer,
  TxBaseInfoContainer,
} from './-styled';
import { getSuiCoinType, getSuiClient } from '@/onechain/utils';
import { OCT_COIN_TYPE, SUI_COIN_TYPE } from '@/constants/sui';
import { ZKLOGIN_SUPPORTED_CHAIN_ID } from '@/constants/zklogin.ts';
import VerifyPasswordBottomSheet from '@components/VerifyPasswordBottomSheet';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';


type EntryProps = {
  request: SuiSignAndExecuteTransactionBlock | SuiSignTransactionBlock | SuiSignAndExecuteTransaction | SuiSignTransaction;
};

export default function Entry({ request }: EntryProps) {
  const { t } = useTranslation();
  const { deQueue } = useCurrentRequestQueue();

  const { currentSuiNetwork } = useCurrentSuiNetwork();
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);

  const isOct = useMemo(() => {
    return !!currentSuiNetwork?.id.includes('oct');
  }, [currentSuiNetwork]);
  const COIN_TYPE = isOct ? OCT_COIN_TYPE : SUI_COIN_TYPE;

  console.log('      currentSuiNetwork', currentSuiNetwork);

  const { currentAccount, incrementTxCountForOrigin } = useCurrentAccount();
  const { currentPassword } = useCurrentPassword();

  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
    disableDupeEthermint: true,
  });

  const nativeAccountAsset = useMemo(
    () =>
      currentSuiNetwork &&
      accountAllAssets?.suiAccountAssets.find((item) => isSameChain(item.chain, currentSuiNetwork) && isEqualsIgnoringCase(item.asset.id, COIN_TYPE)),
    [COIN_TYPE, accountAllAssets, currentSuiNetwork],
  );

  const nativeAccountAssetCoinId = useMemo(() => (nativeAccountAsset ? getCoinId(nativeAccountAsset.asset) : ''), [nativeAccountAsset]);

  const { params, origin } = request;

  const { siteIconURL } = useSiteIconURL(origin);
  const siteTitle = getSiteTitle(origin);

  const [isProcessing, setIsProcessing] = useState(false);

  const [tabValue, setTabValue] = useState(0);
  const tabLabels = ['Summary', 'View Details'];

  const handleChange = (_: React.SyntheticEvent, newTabValue: number) => {
    setTabValue(newTabValue);
  };

  const keyPair = useMemo(
    () => {
      if (currentAccount.type === 'ZKLOGIN') {
        return null; // zklogin accounts don't use traditional keypairs
      }
      return currentSuiNetwork && getKeypair(currentSuiNetwork, currentAccount, currentPassword);
    },
    [currentAccount, currentSuiNetwork, currentPassword],
  );
  const address = useMemo(
    () => {
      if (currentAccount.type === 'ZKLOGIN') {
        const zkLoginAccount = currentAccount as ZkLoginAccount;
        return zkLoginAccount.address;
      }
      return (currentSuiNetwork && keyPair?.publicKey ? getAddress(currentSuiNetwork, keyPair.publicKey) : '');
    },
    [currentAccount, currentSuiNetwork, keyPair?.publicKey],
  );

  const parsedTx = useMemo(() => {
    const txBlock = isOct ? TransactionOct.from(params[0].transactionBlockSerialized) : Transaction.from(params[0].transactionBlockSerialized);
    txBlock.setSenderIfNotSet(address);

    return txBlock;
  }, [address, isOct, params]);

  const transactionBlockResponseOptions = useMemo(() => {
    if (request.method === 'sui_signAndExecuteTransactionBlock' || request.method === 'sui_signAndExecuteTransaction') {
      const inputOptions = 'options' in params[0] ? params[0].options : undefined;

      return {
        showInput: true,
        showEffects: true,
        showEvents: true,
        ...inputOptions,
      };
    }

    return undefined;
  }, [params, request.method]);

  const { data: dryRunTransaction, error: dryRunTransactionError } = useDryRunTransaction({
    coinId: nativeAccountAssetCoinId,
    transaction: parsedTx,
  });

  const expectedBaseFee = useMemo(() => {
    if (dryRunTransaction?.result?.effects.gasUsed) {
      const storageCost = minus(dryRunTransaction.result.effects.gasUsed.storageCost, dryRunTransaction.result.effects.gasUsed.storageRebate);

      const cost = plus(dryRunTransaction.result.effects.gasUsed.computationCost, gt(storageCost, 0) ? storageCost : 0);

      return String(cost);
    }

    return '0';
  }, [dryRunTransaction?.result?.effects.gasUsed]);

  const isDiabled = useMemo(() => !(dryRunTransaction?.result?.effects.status.status === 'success'), [dryRunTransaction?.result?.effects.status.status]);

  const errorMessage = useMemo(() => {
    if (dryRunTransactionError?.message) {
      const idx = dryRunTransactionError.message.lastIndexOf(':');

      return dryRunTransactionError.message.substring(idx === -1 ? 0 : idx + 1).trim();
    }

    if (dryRunTransaction?.result?.effects.status.error) {
      return dryRunTransaction?.result.effects.status.error;
    }

    if (dryRunTransaction === null) {
      return 'Unknown Error';
    }

    if (dryRunTransaction?.result?.effects.status.status !== 'success') {
      return t('pages.popup.sui.transaction.entry.failedToDryRun');
    }

    return '';
  }, [dryRunTransaction, dryRunTransactionError?.message, t]);

  const executeSignMessage = useCallback(async () => {
    try {
      setIsProcessing(true);

      if (!nativeAccountAsset) {
        throw new Error('accountAsset does not exist');
      }

      if (!parsedTx) {
        throw new Error('Failed to calculate final transaction');
      }

      let signer: Ed25519Keypair | MyStenEd25519Keypair;
      let isZkLogin = false;
      let zkLoginSignatureInputs: any = null;
      let zkLoginMaxEpoch = 0;

      if (currentAccount.type === 'ZKLOGIN') {
        if (!currentPassword) {
          throw new Error('Password required for zklogin account');
        }

        isZkLogin = true;
        const zkLoginAccount = currentAccount as ZkLoginAccount;
        const ephemeralKeyData = aesDecrypt(zkLoginAccount.encryptedEphemeralKey, currentPassword);
        signer = MyStenEd25519Keypair.fromSecretKey(ephemeralKeyData);

        // Prepare zklogin signature inputs
        const idToken = aesDecrypt(zkLoginAccount.encryptedIdToken, currentPassword);
        const userSalt = aesDecrypt(zkLoginAccount.encryptedUserSalt, currentPassword);
        const zkProofData = aesDecrypt(zkLoginAccount.encryptedZkProof, currentPassword);

        const partialZkLoginSignature: PartialZkLoginSignature = JSON.parse(zkProofData);
        const decodedJwt = jwtDecode<IdTokenPayload>(idToken);
        const addressSeed = genAddressSeed(
          BigInt(userSalt),
          'sub',
          decodedJwt.sub!,
          decodedJwt.aud as string,
        ).toString();

        zkLoginSignatureInputs = {
          ...partialZkLoginSignature,
          addressSeed,
        };
        zkLoginMaxEpoch = zkLoginAccount.maxEpoch;
      } else {
        if (!keyPair) {
          throw new Error('key pair does not exist');
        }
        const privateKey = keyPair.privateKey;
        const privateKeyBuffer = Buffer.from(privateKey, 'hex');
        signer = Ed25519Keypair.fromSecretKey(privateKeyBuffer);
      }

      const rpcURLs = nativeAccountAsset?.chain.rpcUrls.map((item) => item.url) || [];

      if (request.method === 'sui_signTransactionBlock' || request.method === 'sui_signTransaction') {
        let response: any;

        if (isZkLogin) {
          // For zklogin accounts, we need to sign differently
          const rpcUrl = nativeAccountAsset.chain.rpcUrls.length > 0 ?
            nativeAccountAsset.chain.rpcUrls[0].url :
            RPC_URL[ZKLOGIN_SUPPORTED_CHAIN_ID];

          const client = getSuiClient(isOct, rpcUrl);

          const { bytes, signature: userSignature } = await parsedTx.sign({
            // @ts-expect-error - client type compatibility issue between @mysten/sui and @onelabs/sui
            client,
            signer: signer as MyStenEd25519Keypair,
          });

          const zkLoginSignature = getZkLoginSignature({
            inputs: zkLoginSignatureInputs,
            maxEpoch: zkLoginMaxEpoch,
            userSignature,
          });

          response = {
            bytes,
            signature: zkLoginSignature,
          };
        } else {
          response = await signTxSequentially(signer as Ed25519Keypair, parsedTx, rpcURLs);
        }

        const result = (() => {
          if (request.method === 'sui_signTransactionBlock') {
            return {
              transactionBlockBytes: response.bytes,
              signature: response.signature,
            };
          }

          if (request.method === 'sui_signTransaction') {
            return {
              bytes: response.bytes,
              signature: response.signature,
            };
          }
          return undefined;
        })();

        if (!result) {
          throw new Error('Failed to sign transaction');
        }

        await incrementTxCountForOrigin(request.origin);

        sendMessage({
          target: 'CONTENT',
          method: 'responseApp',
          origin: request.origin,
          requestId: request.requestId,
          tabId: request.tabId,
          params: {
            id: request.requestId,
            result,
          },
        });
      }

      if (request.method === 'sui_signAndExecuteTransactionBlock' || request.method === 'sui_signAndExecuteTransaction') {
        let response: any;

        if (isZkLogin) {
          // For zklogin accounts, we need to execute differently
          const rpcUrl = nativeAccountAsset.chain.rpcUrls.length > 0 ?
            nativeAccountAsset.chain.rpcUrls[0].url :
            RPC_URL[ZKLOGIN_SUPPORTED_CHAIN_ID];

          const client = getSuiClient(isOct, rpcUrl);

          const { bytes, signature: userSignature } = await parsedTx.sign({
            // @ts-expect-error - client type compatibility issue between @mysten/sui and @onelabs/sui
            client,
            signer: signer as MyStenEd25519Keypair,
          });

          const zkLoginSignature = getZkLoginSignature({
            inputs: zkLoginSignatureInputs,
            maxEpoch: zkLoginMaxEpoch,
            userSignature,
          });

          response = await client.executeTransactionBlock({
            transactionBlock: bytes,
            signature: zkLoginSignature,
            options: transactionBlockResponseOptions,
          });
        } else {
          response = await signAndExecuteTxSequentially(signer as Ed25519Keypair, parsedTx, rpcURLs, transactionBlockResponseOptions);
        }

        const result = (() => {
          if (request.method === 'sui_signAndExecuteTransactionBlock') {
            return {
              ...response,
            };
          }

          if (request.method === 'sui_signAndExecuteTransaction') {
            const [
              {
                txSignatures: [transactionSignature],
                intentMessage: { value: bcsTransaction },
              },
            ] = bcs.SenderSignedData.parse(Buffer.from(response.rawTransaction!, 'base64'));

            const bytes = bcs.TransactionData.serialize(bcsTransaction).toBase64();

            return {
              digest: response.digest,
              effects: Buffer.from(new Uint8Array(response.rawEffects!)).toString('base64'),
              bytes,
              signature: transactionSignature,
            };
          }

          return undefined;
        })();

        if (!result) {
          throw new Error('Failed to sign and execute transaction');
        }

        await incrementTxCountForOrigin(request.origin);

        sendMessage({
          target: 'CONTENT',
          method: 'responseApp',
          origin: request.origin,
          requestId: request.requestId,
          tabId: request.tabId,
          params: {
            id: request.requestId,
            result,
          },
        });
      }
    } catch {
      sendMessage({
        target: 'CONTENT',
        method: 'responseApp',
        origin: request.origin,
        requestId: request.requestId,
        tabId: request.tabId,
        params: {
          id: request.requestId,
          error: {
            code: RPC_ERROR.INVALID_INPUT,
            message: `${RPC_ERROR_MESSAGE[RPC_ERROR.INVALID_INPUT]}`,
          },
        },
      });
    } finally {
      setIsProcessing(false);

      await deQueue();
    }
  }, [
    deQueue,
    incrementTxCountForOrigin,
    keyPair,
    nativeAccountAsset,
    parsedTx,
    request.method,
    request.origin,
    request.requestId,
    request.tabId,
    transactionBlockResponseOptions,
  ]);

  const { isSignatureEnabled } = useExtensionStorageStore((state) => state);

  const handleOnClickSign = () => {
    if (isSignatureEnabled) {
      setShowPasswordVerification(true);
    } else {
      executeSignMessage();
    }
  };

  const handlePasswordVerified = () => {
    setShowPasswordVerification(false);
    executeSignMessage();
  };

  const handlePasswordVerificationClose = () => {
    setShowPasswordVerification(false);
  };

  return (
    <>
      <BaseBody>
        <EdgeAligner>
          <DappInfo image={siteIconURL} name={siteTitle} url={origin} />
          <Divider />
          <TxBaseInfoContainer>
            <BaseTxInfo feeCoinId={nativeAccountAssetCoinId} feeBaseAmount={expectedBaseFee} disableFee />
          </TxBaseInfoContainer>
          {/*<DividerContainer>*/}
          {/*  <Divider />*/}
          {/*</DividerContainer>*/}
          {/*<LineDivider />*/}
          <SuiStickyTabContainer>
            <FilledTabs value={tabValue} onChange={handleChange} variant="fullWidth">
              {tabLabels.map((item) => (
                <FilledTab key={item} label={item} />
              ))}
            </FilledTabs>
          </SuiStickyTabContainer>
          <ScrollableStyledTabPanel value={tabValue} index={0}>
            <TxMessage tx={parsedTx} />
          </ScrollableStyledTabPanel>
          <ScrollableStyledTabPanel value={tabValue} index={1}>
            <RawTxContainer>
              <RawTx tx={parsedTx.getData()} />
            </RawTxContainer>
          </ScrollableStyledTabPanel>
        </EdgeAligner>
      </BaseBody>

      <SticktFooterInnerBody>
        <SplitButtonsLayout
          cancelButton={
            <Button
              onClick={async () => {
                sendMessage({
                  target: 'CONTENT',
                  method: 'responseApp',
                  origin: request.origin,
                  requestId: request.requestId,
                  tabId: request.tabId,
                  params: {
                    id: request.requestId,
                    error: {
                      code: RPC_ERROR.USER_REJECTED_REQUEST,
                      message: `${RPC_ERROR_MESSAGE[RPC_ERROR.USER_REJECTED_REQUEST]}`,
                    },
                  },
                });

                await deQueue();
              }}
              variant="dark"
            >
              {t('pages.popup.sui.transaction.entry.reject')}
            </Button>
          }
          confirmButton={
            <Tooltip title={errorMessage} varient="error" placement="top">
              <div>
                <Button isProgress={isProcessing} disabled={isDiabled || !!errorMessage} onClick={handleOnClickSign}>
                  {t('pages.popup.sui.transaction.entry.sign')}
                </Button>
              </div>
            </Tooltip>
          }
        />
      </SticktFooterInnerBody>
      <VerifyPasswordBottomSheet
        open={showPasswordVerification}
        onClose={handlePasswordVerificationClose}
        onSubmit={handlePasswordVerified}
      />
    </>
  );
}
