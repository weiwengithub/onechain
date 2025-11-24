import { useTranslation } from 'react-i18next';

import BaseLayout from '@/components/BaseLayout';
import Base1300Text from '@/components/common/Base1300Text';
import Header from '@/components/Header';
import NavigationPanel from '@/components/Header/components/NavigationPanel';

interface LayoutProps {
  children: JSX.Element;
}

export default function HistoryLayout({ children }: LayoutProps) {
  const { t } = useTranslation();

  const title = t('pages.onetransfer.history.layout.header');

  return (
    <BaseLayout
      header={(
        <Header
          leftContent={<NavigationPanel />}
          middleContent={<Base1300Text variant="h4_B">{title}</Base1300Text>}
        />
      )}
    >
      {children}
    </BaseLayout>
  );
}
