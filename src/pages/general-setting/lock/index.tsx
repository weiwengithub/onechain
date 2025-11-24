import { createFileRoute } from '@tanstack/react-router'

import Entry from './-entry'
import Layout from './-layout'

export const Route = createFileRoute('/general-setting/lock/')({
  component: Lock,
})

function Lock() {
  return (
    <Layout>
      <Entry />
    </Layout>
  )
}
