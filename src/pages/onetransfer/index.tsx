import { createFileRoute } from '@tanstack/react-router'

import Entry from './-entry'
import Layout from './-layout'

export const Route = createFileRoute('/onetransfer/')({
  component: OneTransfer,
})

function OneTransfer() {
  return (
    <Layout>
      <Entry />
    </Layout>
  )
}
