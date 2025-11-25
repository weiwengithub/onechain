import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ed25519Keypair } from '@onelabs/sui/keypairs/ed25519';
import { Ed25519Keypair as MyStenEd25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import Base1000Text from '@/components/common/Base1000Text';
import Base1300Text from '@/components/common/Base1300Text';
import Button from '@/components/common/Button';
import SplitButtonsLayout from '@/components/common/SplitButtonsLayout';
import VerifyPasswordBottomSheet from '@/components/VerifyPasswordBottomSheet';
import { RPC_ERROR, RPC_ERROR_MESSAGE } from '@/constants/error';
import { useSiteIconURL } from '@/hooks/common/useSiteIconURL';
import { useCurrentRequestQueue } from '@/hooks/current/useCurrentRequestQueue';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { getKeypair } from '@/libs/address';
import type { ZkLoginAccount } from '@/types/account';
import { aesDecrypt } from '@/utils/crypto';
import type { IdTokenPayload } from '@/hooks/useZklogin';
import type { PartialZkLoginSignature } from '@/utils/sui/zkloginService';
import { sendMessage } from '@/libs/extension';
import type { SuiSignMessage, SuiSignPersonalMessage } from '@/types/message/inject/sui';
import { getUniqueChainId } from '@/utils/queryParamGenerator';
import { getSiteTitle } from '@/utils/website';

import { ContentsContainer, Divider, LineDivider, SticktFooterInnerBody } from './-styled';
import { LabelContainer, MemoContainer } from '../../-components/CommonTxMessageStyle';
import DappInfo from '../../-components/DappInfo';
import NetworkInfo from '../../-components/NetworkInfo';
import RequestMethodTitle from '../../-components/RequestMethodTitle';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import { useCurrentEVMNetwork } from '@/hooks/evm/useCurrentEvmNetwork.ts';
import { useCurrentAptosNetwork } from '@/hooks/aptos/useCurrentAptosNetwork.ts';

type EntryProps = {
  request: SuiSignMessage | SuiSignPersonalMessage;
};

export default function Entry({ request }: EntryProps) {
  const { t } = useTranslation();

  const { currentRequestQueue, deQueue } = useCurrentRequestQueue();

  const { currentAccount } = useCurrentAccount();
  const { currentPassword } = useCurrentPassword();
  const { selectedChainFilterId } = useExtensionStorageStore((state) => state);

  const { currentSuiNetwork, suiNetworks } = useCurrentSuiNetwork();
  const { currentEVMNetwork } = useCurrentEVMNetwork();
  const { currentAptosNetwork } = useCurrentAptosNetwork();
  // const currentSuiChainId = useMemo(() => currentSuiNetwork && getUniqueChainId(currentSuiNetwork), [currentSuiNetwork]);

  const getSelectedNetwork = () => {
    // 如果用户选择了"所有网络"（selectedChainFilterId 为 null），则使用 OneChain 主网
    if (!selectedChainFilterId) {
      return suiNetworks.find((item) => {
        return item.id === 'oct';
      });
    }

    if (currentRequestQueue?.chainType === 'sui') {
      return currentSuiNetwork; // 使用用户当前选中的 SUI 网络
    } else if (currentRequestQueue?.chainType === 'evm') {
      return currentEVMNetwork;
    } else if (currentRequestQueue?.chainType === 'aptos') {
      return currentAptosNetwork;
    }
  };

  const selectedNetwork = getSelectedNetwork();
  const uniqueChainId = selectedNetwork ? getUniqueChainId(selectedNetwork) : 'oct__sui';

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);

  const { siteIconURL } = useSiteIconURL(request.origin);
  const siteTitle = getSiteTitle(request.origin);

  const keyPair = useMemo(
    () => {
      if (currentAccount.type === 'ZKLOGIN') {
        return null; // zklogin accounts don't use traditional keypairs
      }
      return selectedNetwork && getKeypair(selectedNetwork, currentAccount, currentPassword);
    },
    [currentAccount, selectedNetwork, currentPassword],
  );

  const encodedMessage = useMemo(() => Buffer.from(request.params.message, 'base64'), [request.params.message]);

  const decodedMessage = useMemo(() => encodedMessage.toString('utf8'), [encodedMessage]);

  const executeSignMessage = async () => {
    try {
      setIsProcessing(true);

      let response: any;

      if (currentAccount.type === 'ZKLOGIN') {
        if (!currentPassword) {
          throw new Error('Password required for zklogin account');
        }

        const zkLoginAccount = currentAccount as ZkLoginAccount;
        const ephemeralKeyData = aesDecrypt(zkLoginAccount.encryptedEphemeralKey, currentPassword);
        const ephemeralKeyPair = MyStenEd25519Keypair.fromSecretKey(ephemeralKeyData);

        // Sign the message with ephemeral key
        const userSignature = await ephemeralKeyPair.signPersonalMessage(encodedMessage);

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

        const zkLoginSignature = getZkLoginSignature({
          inputs: {
            ...partialZkLoginSignature,
            addressSeed,
          },
          maxEpoch: zkLoginAccount.maxEpoch,
          userSignature: userSignature.signature,
        });

        response = {
          bytes: userSignature.bytes,
          signature: zkLoginSignature,
        };
      } else {
        if (!keyPair?.privateKey) {
          throw new Error('Invalid keypair');
        }

        const privateKeyBuffer = Buffer.from(keyPair.privateKey, 'hex');
        const keypair = Ed25519Keypair.fromSecretKey(privateKeyBuffer);
        response = await keypair.signPersonalMessage(encodedMessage);
      }

      const result = (() => {
        if (request.method === 'sui_signMessage') {
          return {
            messageBytes: response.bytes,
            signature: response.signature,
          };
        }

        if (request.method === 'sui_signPersonalMessage') {
          return {
            bytes: response.bytes,
            signature: response.signature,
          };
        }

        return undefined;
      })();

      if (!result) {
        throw new Error('Failed to sign message');
      }

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
  };

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
          <DappInfo image={siteIconURL} name={siteTitle} url={currentRequestQueue?.origin} />
          <Divider />
          {uniqueChainId && <NetworkInfo chainId={uniqueChainId} />}
          <LineDivider />
          <RequestMethodTitle title={t('pages.popup.sui.sign-message.entry.signatureRequest')} />
        </EdgeAligner>
        <Divider
          sx={{
            marginBottom: '1.62rem',
          }}
        />
        <ContentsContainer>
          <LabelContainer>
            <Base1000Text
              variant="b3_R"
              sx={{
                marginBottom: '0.4rem',
              }}
            >
              {t('pages.popup.sui.sign-message.entry.message')}
            </Base1000Text>
            <MemoContainer>
              <Base1300Text variant="b3_M">{decodedMessage}</Base1300Text>
            </MemoContainer>
          </LabelContainer>
        </ContentsContainer>
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
              {t('pages.popup.sui.sign-message.entry.reject')}
            </Button>
          }
          confirmButton={
            <Button isProgress={isProcessing} onClick={handleOnClickSign}>
              {t('pages.popup.sui.sign-message.entry.sign')}
            </Button>
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
