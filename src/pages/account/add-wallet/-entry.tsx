import { useTranslation } from 'react-i18next';
// import { Typography } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
// import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import TextButton from '@/components/common/TextButton';
// import InformationPanel from '@/components/InformationPanel';
import { Route as CreateMnemonic } from '@/pages/account/create-wallet/mnemonic';
import { Route as RestoreWalletWithMnemonic } from '@/pages/account/restore-wallet/mnemonic';
// import { Route as RestoreWalletWithPrivateKey } from '@/pages/account/restore-wallet/privatekey';

// import OptionButton from './-components/OptionButton';
import { Body, DescriptionText, FooterContainer } from './-styled';

// import CreateWalletIcon from '@/assets/images/icons/CreateWallet28.svg';
// import MnemonicWalletIcon from '@/assets/images/icons/MnemonicWallet28.svg';
// import PrivateKeyWalletIcon from '@/assets/images/icons/PrivateKeyWallet28.svg';
import BgLeft from '@/assets/img/HomeBackgroundLeft.png';
import BgRight from '@/assets/img/HomeBackgroundRight.png';
import HomeIcon from '@/assets/img/home_icon.png';
// import { Route as SetPassword } from '@/pages/account/set-password';
import AddPrimaryIcon from '@/assets/img/icon/add_primary.png';
import AddGreyIcon from '@/assets/img/icon/add_grey.png';
// import CheckboxIcon from '@/assets/img/icon/checkbox.png';
// import CheckboxCheckedIcon from '@/assets/img/icon/checkbox_checked.png';

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <>
      <BaseBody>
        <Body>
          <img
            src={BgLeft}
            alt="HomeIcon"
            className="absolute top-[37px] left-0"
          />
          <img
            src={BgRight}
            alt="HomeIcon"
            className="absolute top-0 right-0"
          />
          <img
            src={HomeIcon}
            alt="HomeIcon"
            className="mx-auto"
          />
          <div className="mx-auto mt-[-2px] w-[240px] text-center text-[42px] leading-[46px] font-bold text-white">{t("pages.account.initial.index.welcome")}</div>
          <div className="mt-[4px] h-[22px] text-center text-[18px] leading-[22px] opacity-60 text-white">{t("pages.account.initial.index.slogan")}</div>
          <div className="mt-[45px] flex h-[170px] justify-center">
            <div
              className="w-[140px] cursor-pointer rounded-[16px] bg-[#0047C4] p-[20px]"
              onClick={() => {
                navigate({ to: CreateMnemonic.to });
              }}
            >
              <div className="size-[36px] rounded-[40px] bg-white pt-[8px]">
                <img
                  src={AddPrimaryIcon}
                  alt="create"
                  className="ml-[8px] size-[20px]"
                />
              </div>
              <div className="mt-[51px] w-[66px] text-[20px] leading-[23px] text-white">{t("pages.account.initial.index.createWallet")}</div>
            </div>
            <div
              onClick={() => {
                navigate({ to: RestoreWalletWithMnemonic.to });
              }}
              className="ml-[16px] w-[140px] cursor-pointer rounded-[16px] bg-[#1E2025] p-[20px]"
            >
              <div className="size-[36px] rounded-[40px] bg-white pt-[8px]">
                <img
                  src={AddGreyIcon}
                  alt="import"
                  className="ml-[8px] size-[20px]"
                />
              </div>
              <div className="mt-[51px] w-[66px] text-[20px] leading-[23px] font-bold text-white">{t("pages.account.initial.index.importWallet")}</div>
            </div>
          </div>
          {/*<InformationPanel*/}
          {/*  varitant="info"*/}
          {/*  title={<Typography variant="b3_M">{t('pages.account.add-wallet.index.infoTitle')}</Typography>}*/}
          {/*  body={<Typography variant="b4_R_Multiline">{t('pages.account.add-wallet.index.infoBody')}</Typography>}*/}
          {/*/>*/}

          {/*<EdgeAligner>*/}
          {/*  <OptionButtonsContainer>*/}
          {/*    <OptionButton*/}
          {/*      onClick={() =>*/}
          {/*        navigate({*/}
          {/*          to: CreateMnemonic.to,*/}
          {/*        })*/}
          {/*      }*/}
          {/*      icon={<CreateWalletIcon />}*/}
          {/*      titleText={t('pages.account.add-wallet.index.createNewWallet')}*/}
          {/*      bodyText={t('pages.account.add-wallet.index.createNewWalletDescription')}*/}
          {/*    />*/}
          {/*    <OptionButton*/}
          {/*      onClick={() =>*/}
          {/*        navigate({*/}
          {/*          to: RestoreWalletWithMnemonic.to,*/}
          {/*        })*/}
          {/*      }*/}
          {/*      icon={<MnemonicWalletIcon />}*/}
          {/*      titleText={t('pages.account.add-wallet.index.restoreWithMnemonic')}*/}
          {/*      bodyText={t('pages.account.add-wallet.index.restoreWithMnemonicDescription')}*/}
          {/*    />*/}
          {/*    <OptionButton*/}
          {/*      onClick={() =>*/}
          {/*        navigate({*/}
          {/*          to: RestoreWalletWithPrivateKey.to,*/}
          {/*        })*/}
          {/*      }*/}
          {/*      icon={<PrivateKeyWalletIcon />}*/}
          {/*      titleText={t('pages.account.add-wallet.index.restoreWithPrivateKey')}*/}
          {/*      bodyText={t('pages.account.add-wallet.index.restoreWithPrivateKeyDescription')}*/}
          {/*    />*/}
          {/*  </OptionButtonsContainer>*/}
          {/*</EdgeAligner>*/}
        </Body>
      </BaseBody>
      <BaseFooter>
        <FooterContainer
          style={{
            display: 'none',
          }}
        >
          <DescriptionText variant="b3_R">{t('pages.account.add-wallet.index.guide')}</DescriptionText>
          <TextButton variant="hyperlink">{t('pages.account.add-wallet.index.goToGuide')}</TextButton>
        </FooterContainer>
      </BaseFooter>
    </>
  );
}
