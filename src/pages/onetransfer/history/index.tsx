import { createFileRoute } from '@tanstack/react-router';

import Entry from './-entry';
import Layout from './-layout';

export const Route = createFileRoute('/onetransfer/history/')({
  component: OneTransferHistory,
});

function OneTransferHistory() {
  return (
    <Layout>
      <Entry />
    </Layout>
  );
}
