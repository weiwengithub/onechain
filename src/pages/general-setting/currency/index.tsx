import { createFileRoute } from '@tanstack/react-router'

import Entry from './-entry'
import Layout from './-layout'

export const Route = createFileRoute('/general-setting/currency/')({
  component: Currency,
})

function Currency() {
  return (
    <Layout>
      <Entry />
    </Layout>
  )
}
