import { useTranslation } from 'react-i18next';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import Base1000Text from '@/components/common/Base1000Text';
import Base1300Text from '@/components/common/Base1300Text';
import BaseOptionButton from '@/components/common/BaseOptionButton';
import { extension } from '@/utils/browser';

import { AppContainer, AppIconImageContainer, AppVersionText, ButtonContainer, ButtonIconContainer, Container, StickyContainer } from './-styled';

import CNImage from 'assets/images/country/china.png';
import EUImage from 'assets/images/country/euro.png';
import JPNImage from 'assets/images/country/japan.png';
import KRImage from 'assets/images/country/korea.png';
import USImage from 'assets/images/country/us.png';
import CheckedIcon from '@/assets/images/icons/Checked18.svg';
import { LANGUAGE_TYPE } from '@/constants/language.ts';
import { CURRENCY_TYPE } from '@/constants/currency.ts';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import type { CurrencyType } from '@/types/currency.ts';
import Image from '@components/common/Image';


export default function Entry() {
  const { t } = useTranslation();

  const { userCurrencyPreference, updateExtensionStorageStore } = useExtensionStorageStore((state) => state);

  const onHandleClick = (currencyType: CurrencyType) => {
    updateExtensionStorageStore('userCurrencyPreference', currencyType);
  };

  const tempDisplay = false;
  return (
    <BaseBody>
      <EdgeAligner>
        <Container>
          {Object.values(CURRENCY_TYPE).map((item) => {
            const isActive = item === userCurrencyPreference;

            return (
              <div
                key={item}
                className="flex items-center justify-between mb-[36px]"
                onClick={(val) => {
                  onHandleClick(item);
                  history.back();
                }}
              >
                {item === CURRENCY_TYPE.USD && (
                  <div className="flex items-center">
                    <Image src={USImage} />
                    <div className="ml-[12px]">
                      <div className={`h-[20px] leading-[20px] text-[18px] font-medium ${isActive ? "text-[#477CFC]" : "text-white"}`}>
                        {item.toUpperCase()}
                      </div>
                      <div className="h-[20px] leading-[20px] text-white text-[14px] opacity-40">
                        {t('pages.general-setting.components.CurrencyBottomSheet.components.OptionButton.index.us')}
                      </div>
                    </div>
                  </div>
                )}
                {tempDisplay && item === CURRENCY_TYPE.KRW && (
                  <div className="flex items-center">
                    <Image src={KRImage} />
                    <div className="ml-[12px]">
                      <div className={`h-[20px] leading-[20px] text-[18px] font-medium ${isActive ? "text-[#477CFC]" : "text-white"}`}>
                        {item.toUpperCase()}
                      </div>
                      <div className="h-[20px] leading-[20px] text-white text-[14px] opacity-40">
                        {t('pages.general-setting.components.CurrencyBottomSheet.components.OptionButton.index.kr')}
                      </div>
                    </div>
                  </div>
                )}
                {tempDisplay && item === CURRENCY_TYPE.JPY && (
                  <div className="flex items-center">
                    <Image src={JPNImage} />
                    <div className="ml-[12px]">
                      <div className={`h-[20px] leading-[20px] text-[18px] font-medium ${isActive ? "text-[#477CFC]" : "text-white"}`}>
                        {item.toUpperCase()}
                      </div>
                      <div className="h-[20px] leading-[20px] text-white text-[14px] opacity-40">
                        {t('pages.general-setting.components.CurrencyBottomSheet.components.OptionButton.index.jp')}
                      </div>
                    </div>
                  </div>
                )}
                {tempDisplay && item === CURRENCY_TYPE.CNY && (
                  <div className="flex items-center">
                    <Image src={CNImage} />
                    <div className="ml-[12px]">
                      <div className={`h-[20px] leading-[20px] text-[18px] font-medium ${isActive ? "text-[#477CFC]" : "text-white"}`}>
                        {item.toUpperCase()}
                      </div>
                      <div className="h-[20px] leading-[20px] text-white text-[14px] opacity-40">
                        {t('pages.general-setting.components.CurrencyBottomSheet.components.OptionButton.index.cn')}
                      </div>
                    </div>
                  </div>
                )}
                {tempDisplay && item === CURRENCY_TYPE.EUR && (
                  <div className="flex items-center">
                    <Image src={EUImage} />
                    <div className="ml-[12px]">
                      <div className={`h-[20px] leading-[20px] text-[18px] font-medium ${isActive ? "text-[#477CFC]" : "text-white"}`}>
                        {item.toUpperCase()}
                      </div>
                      <div className="h-[20px] leading-[20px] text-white text-[14px] opacity-40">
                        {t('pages.general-setting.components.CurrencyBottomSheet.components.OptionButton.index.eu')}
                      </div>
                    </div>
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
