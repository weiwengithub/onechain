import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from '@mui/material';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import Base1000Text from '@/components/common/Base1000Text';
import Base1300Text from '@/components/common/Base1300Text';
import Button from '@/components/common/Button';
import SplitButtonsLayout from '@/components/common/SplitButtonsLayout';
import InformationPanel from '@/components/InformationPanel';
import VerifyPasswordBottomSheet from '@/components/VerifyPasswordBottomSheet';
import { RPC_ERROR, RPC_ERROR_MESSAGE } from '@/constants/error';
import { PERMISSION } from '@/constants/sui';
import { useSiteIconURL } from '@/hooks/common/useSiteIconURL';
import { useCurrentRequestQueue } from '@/hooks/current/useCurrentRequestQueue';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork';
import { sendMessage } from '@/libs/extension';
import { getSiteTitle } from '@/utils/website';
import { getUniqueChainId } from '@/utils/queryParamGenerator';

import Layout from './layout';
import {
  CheckListContainer,
  CheckListContentsContainer,
  CheckListItemContainer,
  CheckListTitleContainer,
  Divider,
  DividerContainer,
  InformationContainer,
  LineDivider,
} from './styled';
import DappInfo from '../../DappInfo';
import NetworkInfo from '../../NetworkInfo';
import RequestMethodTitle from '../../RequestMethodTitle';

import SuccessIcon from '@/assets/images/icons/Success18.svg';
import { useCurrentEVMNetwork } from '@/hooks/evm/useCurrentEvmNetwork.ts';
import { useCurrentAptosNetwork } from '@/hooks/aptos/useCurrentAptosNetwork.ts';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { octMainnet } from '@/script/service-worker/update/constant';
import type { SuiChain } from '@/types/chain';

type AccessRequestProps = {
  children: JSX.Element;
};

export default function AccessRequest({ children }: AccessRequestProps) {
  const { t } = useTranslation();
  const [showPasswordVerification, setShowPasswordVerification] = useState(false);

  const { currentRequestQueue, deQueue } = useCurrentRequestQueue();

  const {
    addApprovedOrigin,
    addSuiPermissions,
    addIotaPermissions,
    currentAccountApporvedOrigins,
    currentAccountApprovedSuiPermissions,
    currentAccountApprovedIotaPermissions,
  } = useCurrentAccount();

  const { siteIconURL } = useSiteIconURL(currentRequestQueue?.origin);
  const siteTitle = getSiteTitle(currentRequestQueue?.origin);

  const { currentSuiNetwork, suiNetworks } = useCurrentSuiNetwork();
  const { currentEVMNetwork } = useCurrentEVMNetwork();
  const { currentAptosNetwork } = useCurrentAptosNetwork();
  const { selectedChainFilterId } = useExtensionStorageStore((state) => state);
  const { isSignatureEnabled } = useExtensionStorageStore((state) => state);

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

  const currentAccountSuiPermissionTypes = currentAccountApprovedSuiPermissions
    .filter((permission) => permission.origin === currentRequestQueue?.origin)
    .map((permission) => permission.permission);

  const isSuiApporved =
    currentRequestQueue &&
    currentRequestQueue.method === 'sui_connect' &&
    !currentRequestQueue.params.every((permission) => currentAccountSuiPermissionTypes.includes(permission));

  const currentAccountIotaPermissionTypes = currentAccountApprovedIotaPermissions
    .filter((permission) => permission.origin === currentRequestQueue?.origin)
    .map((permission) => permission.permission);

  const isIotaApporved =
    currentRequestQueue &&
    currentRequestQueue.method === 'iota_connect' &&
    !currentRequestQueue.params.every((permission) => currentAccountIotaPermissionTypes.includes(permission));

  const executeConnectionFlow = async () => {
    if (!currentRequestQueue) return;

    await addApprovedOrigin(currentRequestQueue.origin);

    if (currentRequestQueue.method === 'sui_connect') {
      await addSuiPermissions(currentRequestQueue.params as any, currentRequestQueue.origin);
    }

    if (currentRequestQueue.method === 'iota_connect') {
      await addIotaPermissions(currentRequestQueue.params as any, currentRequestQueue.origin);
    }
  };

  const handlePasswordVerified = () => {
    setShowPasswordVerification(false);
    executeConnectionFlow();
  };

  const handlePasswordVerificationClose = () => {
    setShowPasswordVerification(false);
  };

  if (
    (currentRequestQueue?.origin && !currentAccountApporvedOrigins.map((item) => item.origin).includes(currentRequestQueue.origin)) ||
    isSuiApporved ||
    isIotaApporved
  ) {
    return (
      <Layout>
        <>
          <BaseBody>
            <EdgeAligner>
              <DappInfo image={siteIconURL} name={siteTitle} url={currentRequestQueue.origin} />
              <Divider />
              <NetworkInfo chainId={uniqueChainId} />
              <LineDivider />
              <RequestMethodTitle title={t('pages.popup.components.requests.AccessRequest.index.title')} />
              <DividerContainer>
                <Divider />
              </DividerContainer>
              <CheckListContainer>
                <CheckListTitleContainer>
                  <Base1000Text
                    variant="b3_R"
                  >{t('pages.popup.components.requests.AccessRequest.index.allowOption')}</Base1000Text>
                </CheckListTitleContainer>
                {currentRequestQueue.method === 'sui_connect' ? (
                  <CheckListContentsContainer>
                    {currentRequestQueue.params.includes(PERMISSION.VIEW_ACCOUNT) && (
                      <CheckListItemContainer>
                        <SuccessIcon />
                        <Base1300Text
                          variant="b3_R"
                        >{t('pages.popup.components.requests.AccessRequest.index.allowAddress')}</Base1300Text>
                      </CheckListItemContainer>
                    )}
                    {currentRequestQueue.params.includes(PERMISSION.SUGGEST_TRANSACTIONS) && (
                      <CheckListItemContainer>
                        <SuccessIcon />
                        <Base1300Text
                          variant="b3_R"
                        >{t('pages.popup.components.requests.AccessRequest.index.allowRequestSign')}</Base1300Text>
                      </CheckListItemContainer>
                    )}
                  </CheckListContentsContainer>
                ) : (
                  <CheckListContentsContainer>
                    <CheckListItemContainer>
                      <SuccessIcon />
                      <Base1300Text
                        variant="b3_R"
                      >{t('pages.popup.components.requests.AccessRequest.index.allowAddress')}</Base1300Text>
                    </CheckListItemContainer>
                    <CheckListItemContainer>
                      <SuccessIcon />
                      <Base1300Text
                        variant="b3_R"
                      >{t('pages.popup.components.requests.AccessRequest.index.allowRequestSign')}</Base1300Text>
                    </CheckListItemContainer>
                    <CheckListItemContainer>
                      <SuccessIcon />
                      <Base1300Text
                        variant="b3_R"
                      >{t('pages.popup.components.requests.AccessRequest.index.encryptMessage')}</Base1300Text>
                    </CheckListItemContainer>
                  </CheckListContentsContainer>
                )}
              </CheckListContainer>
            </EdgeAligner>
          </BaseBody>
          <BaseFooter>
            <InformationContainer>
              <InformationPanel
                varitant="info"
                title={<Typography
                  variant="b3_M"
                >{t('pages.popup.components.requests.AccessRequest.index.informTitle')}</Typography>}
                body={<Typography
                  variant="b4_R_Multiline"
                >{t('pages.popup.components.requests.AccessRequest.index.informDescription')}</Typography>}
              />
            </InformationContainer>
            <SplitButtonsLayout
              cancelButton={
                <Button
                  onClick={async () => {
                    sendMessage({
                      target: 'CONTENT',
                      method: 'responseApp',
                      origin: currentRequestQueue.origin,
                      requestId: currentRequestQueue.requestId,
                      tabId: currentRequestQueue.tabId,
                      params: {
                        id: currentRequestQueue.requestId,
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
                  {t('pages.popup.components.requests.AccessRequest.index.reject')}
                </Button>
              }
              confirmButton={
                <Button
                  onClick={() => {
                    if (isSignatureEnabled) {
                      setShowPasswordVerification(true);
                    } else {
                      executeConnectionFlow();
                    }
                  }}
                >
                  {t('pages.popup.components.requests.AccessRequest.index.access')}
                </Button>
              }
            />
          </BaseFooter>
          <VerifyPasswordBottomSheet
            open={showPasswordVerification}
            onClose={handlePasswordVerificationClose}
            onSubmit={handlePasswordVerified}
          />
        </>
      </Layout>
    );
  }

  return children;
}
