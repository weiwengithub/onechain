import { createFileRoute } from '@tanstack/react-router';

import Entry from './-entry';
import Layout from './-layout';

export const Route = createFileRoute('/all-network/')({
  component: AllNetwork,
});

function AllNetwork() {
  return (
    <Layout>
      <Entry />
    </Layout>
  );
}
