import { useTranslation } from 'react-i18next';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import { Container } from './-styled';
import { LANGUAGE_TYPE } from '@/constants/language';

import CheckedIcon from '@/assets/images/icons/Checked18.svg';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import type { LanguageType } from '@/types/language.ts';

export default function Entry() {
  const { t, i18n } = useTranslation();

  const { updateExtensionStorageStore } = useExtensionStorageStore((state) => state);

  const onHandleClick = (val: LanguageType) => {
    i18n.changeLanguage(val);
    updateExtensionStorageStore('userLanguagePreference', val);
  };

  const tempDisplay = false;
  return (
    <BaseBody>
      <EdgeAligner>
        <Container>
          {Object.values(LANGUAGE_TYPE).map((item) => {
            const isActive = i18n.resolvedLanguage === item;

            return (
              <div
                key={item}
                className="flex items-center justify-between mb-[36px]"
                onClick={(val) => {
                  onHandleClick(item);
                  history.back();
                }}
              >
                {item === 'en' && (
                  <div
                    className={`h-[20px] leading-[20px] text-[16px] font-medium ${isActive ? 'text-[#477CFC]' : 'text-white'}`}
                  >
                    {t('pages.general-setting.components.LanguageBottomSheet.components.OptionButton.index.english')}
                  </div>
                )}
                {item === 'zh' && (
                  <div
                    className={`h-[20px] leading-[20px] text-[16px] font-medium ${isActive ? 'text-[#477CFC]' : 'text-white'}`}
                  >
                    {t('pages.general-setting.components.LanguageBottomSheet.components.OptionButton.index.chinese')}
                  </div>
                )}

                {isActive && <CheckedIcon />}
              </div>
            );
          })}
        </Container>
      </EdgeAligner>
    </BaseBody>
  );
}
