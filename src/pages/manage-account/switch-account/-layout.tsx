import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import BaseLayout from '@/components/BaseLayout';
import Base1300Text from '@/components/common/Base1300Text';
import Button from '@/components/common/Button';
import Header from '@/components/Header';
import NavigationPanel from '@/components/Header/components/NavigationPanel';
import { Route as AddWallet } from '@/pages/account/add-wallet';
import { Route as ManageWalletAndAccount } from '@/pages/manage-account/manage-wallet-and-account';

import { FooterContainer } from './-styled';

import SplitButtonsLayout from '@components/common/SplitButtonsLayout';

type LayoutProps = {
  children: JSX.Element;
};

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <BaseLayout
      header={
        <Header
          leftContent={<NavigationPanel />}
          middleContent={<Base1300Text variant="h4_B">{t('pages.manage-account.switch-account.layout.header')}</Base1300Text>}
        />
      }
      footer={
        <FooterContainer>
          <SplitButtonsLayout
            cancelButton={
              <Button
                onClick={() => {
                  navigate({
                    to: ManageWalletAndAccount.to,
                  });
                }}
                variant="dark"
              >
                {t('pages.manage-account.switch-account.layout.edit')}
              </Button>
            }
            confirmButton={
              <Button
                onClick={() => {
                  navigate({ to: AddWallet.to });
                }}
              >
                {t('pages.manage-account.switch-account.layout.addWallet')}
              </Button>
            }
          />
        </FooterContainer>
      }
    >
      {children}
    </BaseLayout>
  );
}
