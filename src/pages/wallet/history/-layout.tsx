import BaseLayout from '@/components/BaseLayout';
import Base1300Text from '@/components/common/Base1300Text';
import Header from '@/components/Header';
import NavigationPanel from '@/components/Header/components/NavigationPanel';

type LayoutProps = {
  children: JSX.Element;
};

export default function Layout({ children }: LayoutProps) {

  return (
    <BaseLayout
      header={
        <Header leftContent={<NavigationPanel />} middleContent={<Base1300Text variant="h4_B">Detail</Base1300Text>} />
      }
    >
      {children}
    </BaseLayout>
  );
}
