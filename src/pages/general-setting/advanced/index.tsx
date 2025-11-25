import { createFileRoute } from '@tanstack/react-router';

import Entry from './-entry';
import Layout from './-layout';

export const Route = createFileRoute('/general-setting/advanced/')({
  component: Advanced,
});

function Advanced() {
  return (
    <Layout>
      <Entry />
    </Layout>
  );
}
