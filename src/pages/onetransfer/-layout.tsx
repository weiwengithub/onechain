import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import BaseLayout from '@/components/BaseLayout';
import Base1300Text from '@/components/common/Base1300Text';
import Header from '@/components/Header';
import NavigationPanel from '@/components/Header/components/NavigationPanel';
import IconHistory from 'assets/images/onechain/icon_oneTransfer_history.png';
import type React from 'react';

type LayoutProps = {
  children: JSX.Element;
};

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleClickHistory = () => {
    void navigate({ to: '/onetransfer/history' });
  };

  return (
    <BaseLayout
      header={<Header
        leftContent={<NavigationPanel />}
        middleContent={<Base1300Text variant="h4_B">{t('components.MainBox.Portfolio.index.vault')}</Base1300Text>}
        rightContent={<img
          className="mx-auto size-[16px] "
          src={IconHistory}
          alt={'oneTransferHistory'}
          onClick={handleClickHistory}
        />}
      />}
    >
      {children}
    </BaseLayout>
  );
}
