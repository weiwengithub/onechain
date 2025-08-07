import BaseLayout from '@/components/BaseLayout';
import Header from '@/components/Header';
import NavigationPanel from '@/components/Header/components/NavigationPanel';
import { useTranslation } from 'react-i18next';
import Base1300Text from '@components/common/Base1300Text';

type LayoutProps = {
  children: JSX.Element;
};

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();

  return (
    <BaseLayout
      header={
        <Header
          leftContent={<NavigationPanel isHideHomeButton />}
          middleContent={<Base1300Text variant="h4_B">{t('pages.account.set-password.layout.header')}</Base1300Text>}
        />
      }
    >
      {children}
    </BaseLayout>
  );
}
