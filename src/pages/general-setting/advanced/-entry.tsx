import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import Base1300Text from '@/components/common/Base1300Text';
import { useTranslation } from 'react-i18next';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { toastError, toastSuccess } from '@/utils/toast';

import { Container } from './-styled';

import DevelopIcon from '@/assets/images/icons/develop18.svg';

import { OptionButtonIconContainer } from '@/pages/general-setting/-styled.tsx';
import { useCurrentSuiNetwork } from '@/hooks/sui/useCurrentSuiNetwork.ts';
import { useChainList } from '@/hooks/useChainList.ts';
import { useCallback } from 'react';

export default function Entry() {
  const { t } = useTranslation();
  const { currentSuiNetwork, setCurrentSuiNetwork } = useCurrentSuiNetwork();
  const { chainList } = useChainList();
  // console.log('      chainList', chainList);

  const { isDeveloperMode, updateExtensionStorageStore } = useExtensionStorageStore((state) => state);

  const toggleDeveloperMode = useCallback(async () => {
    const newValue = !isDeveloperMode;
    updateExtensionStorageStore('isDeveloperMode', newValue);
    if (newValue) { //开发模式
      toastSuccess(t('pages.general-setting.advanced.entry.developerModeEnabled'));
    } else {  //普通模式
      if (currentSuiNetwork?.isTestnet) {
        const octChain = chainList?.suiChains?.filter((item) => {
          return item.id === 'oct';
        });
        if (octChain && octChain.length > 0) {
          await setCurrentSuiNetwork(octChain[0]);
          // 同时更新首页的链过滤器
          const octChainId = `${octChain[0].id}__sui`;
          // @ts-ignore
          updateExtensionStorageStore('selectedChainFilterId', octChainId);
        }
      }
      toastError(t('pages.general-setting.advanced.entry.developerModeDisabled'));
    }
  }, [chainList?.suiChains, currentSuiNetwork?.isTestnet, isDeveloperMode, setCurrentSuiNetwork, updateExtensionStorageStore]);

  return (
    <BaseBody>
      <EdgeAligner>
        <Container>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <OptionButtonIconContainer>
                <DevelopIcon />
              </OptionButtonIconContainer>
              <Base1300Text variant="b2_M">{t('pages.general-setting.advanced.entry.developerMode')}</Base1300Text>
            </div>
            <div
              onClick={toggleDeveloperMode}
              className={`w-[35.2px] h-[19.2px] rounded-full p-[1.6px] transition-colors duration-200 ease-in-out cursor-pointer ${isDeveloperMode ? 'bg-[#477CFC]' : 'bg-gray-400'}`}
            >
              <div
                className={`bg-white w-[16px] h-[16px] rounded-full transform transition-transform duration-200 ease-in-out ${isDeveloperMode ? 'translate-x-[16px]' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </Container>
      </EdgeAligner>
    </BaseBody>
  );
}
