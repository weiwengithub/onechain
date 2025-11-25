import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import Base1000Text from '@/components/common/Base1000Text';
import Base1300Text from '@/components/common/Base1300Text';
import BaseOptionButton from '@/components/common/BaseOptionButton';
import { NEVER_LOCK_KEY } from '@/constants/autoLock';
import { PRICE_TREND_TYPE } from '@/constants/price';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { Route as About } from '@/pages/general-setting/about';
import { Route as AddressBook } from '@/pages/general-setting/address-book';
import { Route as Advanced } from '@/pages/general-setting/advanced';
import { Route as BackupWallet } from '@/pages/general-setting/backup-wallet';
import { Route as ChangePassword } from '@/pages/general-setting/change-password';
import { Route as ManageCustomNetwork } from '@/pages/general-setting/manage-custom-network';
import { Route as WalletPrioritize } from '@/pages/general-setting/wallet-prioritize';
import { Route as Language } from '@/pages/general-setting/language';
import { Route as Currency } from '@/pages/general-setting/currency';
import { Route as Lock } from '@/pages/general-setting/lock';
import { extension } from '@/utils/browser';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import {
  Container,
  OptionButtonContainer,
  OptionButtonIconContainer,
  SectionContainer,
  SectionTitleContainer,
} from './-styled';

import AbountIcon from '@/assets/images/icons/About18.svg';
import AddressBookIcon from '@/assets/images/icons/AddressBook18.svg';
import AdvancedIcon from '@/assets/images/icons/Advanced18.svg';
import AutoLockIcon from '@/assets/images/icons/AutoLock28.svg';
import BackupWalletIcon from '@/assets/images/icons/BackupWallet18.svg';
import ChangePasswordIcon from '@/assets/images/icons/ChangePassword18.svg';
import CurrencyIcon from '@/assets/images/icons/Currency18.svg';
import LockIcon from '@/assets/images/icons/Lock18.svg';
import LanguageIcon from '@/assets/images/icons/Language18.svg';
import ManageCustomNetworkIcon from '@/assets/images/icons/Network18.svg';
import PriceChangeColorIcon from '@/assets/images/icons/PriceChangeColor28.svg';
import PrioritizeIcon from '@/assets/images/icons/Prioritize18.svg';
import GreenUpIcon from 'assets/images/icons/GreenUp28.svg';
import RedUpIcon from 'assets/images/icons/RedUp28.svg';

const LangMap: Record<string, string> = {
  en: 'English',
  ko: '한국어',
  zh: '简体中文',
};
export default function Entry() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { currentAccount } = useCurrentAccount();
  const { setCurrentPassword } = useCurrentPassword();
  const {
    userCurrencyPreference,
    userPriceTrendPreference,
    autoLockTimeInMinutes,
  } = useExtensionStorageStore((state) => state);

  const currentSelectedLang = i18n.resolvedLanguage ? LangMap[i18n.resolvedLanguage] : '';

  const { version } = extension.runtime.getManifest();

  const tempDisplay = false;
  return (
    <>
      <BaseBody>
        <EdgeAligner>
          <Container>
            <SectionContainer>
              <OptionButtonContainer>
                {currentAccount.type !== 'ZKLOGIN' && (
                  <BaseOptionButton
                    onClick={() => {
                      navigate({
                        to: BackupWallet.to,
                      });
                    }}
                    leftContent={
                      <OptionButtonIconContainer>
                        <BackupWalletIcon />
                      </OptionButtonIconContainer>
                    }
                    leftSecondHeader={<Base1300Text
                      variant="b2_M"
                    >{t('pages.general-setting.entry.backupWallet')}</Base1300Text>}
                    leftSecondBody={<Base1000Text
                      variant="b4_R"
                    >{t('pages.general-setting.entry.backupWalletDescription')}</Base1000Text>}
                  />
                )}
                <BaseOptionButton
                  onClick={() => {
                    navigate({
                      to: ChangePassword.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <ChangePasswordIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text
                    variant="b2_M"
                  >{t('pages.general-setting.entry.changePassword')}</Base1300Text>}
                  leftSecondBody={<Base1000Text
                    variant="b4_R"
                  >{t('pages.general-setting.entry.changePasswordDescription')}</Base1000Text>}
                />
                <BaseOptionButton
                  onClick={() => {
                    navigate({
                      to: AddressBook.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <AddressBookIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text
                    variant="b2_M"
                  >{t('pages.general-setting.entry.addressBook')}</Base1300Text>}
                  leftSecondBody={<Base1000Text
                    variant="b4_R"
                  >{t('pages.general-setting.entry.addressBookDescription')}</Base1000Text>}
                />
                {tempDisplay && (
                  <BaseOptionButton
                    onClick={() => {
                      navigate({
                        to: ManageCustomNetwork.to,
                      });
                    }}
                    leftContent={
                      <OptionButtonIconContainer>
                        <ManageCustomNetworkIcon />
                      </OptionButtonIconContainer>
                    }
                    leftSecondHeader={<Base1300Text
                      variant="b2_M"
                    >{t('pages.general-setting.entry.network')}</Base1300Text>}
                    leftSecondBody={<Base1000Text
                      variant="b4_R"
                    >{t('pages.general-setting.entry.manageCustomNetworkDescription')}</Base1000Text>}
                  />
                )}
              </OptionButtonContainer>
            </SectionContainer>

            <SectionContainer>
              <OptionButtonContainer>
                {tempDisplay && <BaseOptionButton
                  onClick={() => {
                    navigate({
                      to: WalletPrioritize.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <PrioritizeIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text
                    variant="b2_M"
                  >{t('pages.general-setting.entry.prioritize')}</Base1300Text>}
                  leftSecondBody={<Base1000Text
                    variant="b4_R"
                  >{t('pages.general-setting.entry.prioritizeDescription')}</Base1000Text>}
                />}
                <BaseOptionButton
                  onClick={() => {
                    navigate({
                      to: Language.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <LanguageIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text
                    variant="b2_M"
                  >{t('pages.general-setting.entry.language')}</Base1300Text>}
                  leftSecondBody={<Base1000Text
                    variant="b4_R"
                  >{t('pages.general-setting.entry.languageDescription')}</Base1000Text>}
                  rightContent={<span className="text-white text-[14px] opacity-60">{currentSelectedLang}</span>}
                />
                {tempDisplay && <BaseOptionButton
                  onClick={() => {
                    navigate({
                      to: Currency.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <CurrencyIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text
                    variant="b2_M"
                  >{t('pages.general-setting.entry.currency')}</Base1300Text>}
                  leftSecondBody={<Base1000Text
                    variant="b4_R"
                  >{t('pages.general-setting.entry.currencyDescription')}</Base1000Text>}
                  rightContent={<span
                    className="text-white text-[14px] opacity-60"
                  >{userCurrencyPreference.toUpperCase()}</span>}
                />}
                <BaseOptionButton
                  onClick={() => {
                    navigate({
                      to: About.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <AbountIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text
                    variant="b2_M"
                  >{t('pages.general-setting.entry.about')}</Base1300Text>}
                  leftSecondBody={<Base1000Text
                    variant="b4_R"
                  >{t('pages.general-setting.entry.aboutDescription')}</Base1000Text>}
                />
                <BaseOptionButton
                  onClick={() => {
                    navigate({
                      to: Lock.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <LockIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text variant="b2_M">{t('pages.general-setting.entry.lock')}</Base1300Text>}
                  leftSecondBody={<Base1000Text
                    variant="b4_R"
                  >{t('pages.general-setting.entry.setAutoLockDescription')}</Base1000Text>}
                  rightContent={
                    <span className="text-white text-[14px] opacity-60">
                      {autoLockTimeInMinutes === NEVER_LOCK_KEY
                        ? t('pages.general-setting.entry.never')
                        : Number(autoLockTimeInMinutes) < 60 ? `${autoLockTimeInMinutes} min` : `${Number(autoLockTimeInMinutes) / 60} h`}
                    </span>
                  }
                />
                <BaseOptionButton
                  onClick={() => {
                    void navigate({
                      to: Advanced.to,
                    });
                  }}
                  leftContent={
                    <OptionButtonIconContainer>
                      <AdvancedIcon />
                    </OptionButtonIconContainer>
                  }
                  leftSecondHeader={<Base1300Text
                    variant="b2_M"
                  >{t('pages.general-setting.entry.advanced')}</Base1300Text>}
                  // leftSecondBody={<Base1000Text
                  //   variant="b4_R"
                  // >{t('pages.general-setting.entry.addressBookDescription')}</Base1000Text>}
                />
              </OptionButtonContainer>
            </SectionContainer>

            {tempDisplay && (
              <SectionContainer>
                <OptionButtonContainer>
                  <BaseOptionButton
                    onClick={() => {
                      setCurrentPassword('');
                    }}
                    leftContent={
                      <OptionButtonIconContainer>
                        <LockIcon />
                      </OptionButtonIconContainer>
                    }
                    leftSecondHeader={<Base1300Text
                      variant="b2_M"
                    >{t('pages.general-setting.entry.lock')}</Base1300Text>}
                    leftSecondBody={<Base1000Text
                      variant="b4_R"
                    >{t('pages.general-setting.entry.guideDescription')}</Base1000Text>}
                  />

                </OptionButtonContainer>
              </SectionContainer>
            )}
            <div
              className="mb-[24px] h-[20px] leading-[20px] text-white text-[14px] text-center opacity-40"
            >{version}</div>
          </Container>
        </EdgeAligner>
      </BaseBody>
    </>
  );
}
