import { createFileRoute } from '@tanstack/react-router'

import Entry from './-entry'
import Layout from './-layout'

export const Route = createFileRoute('/general-setting/language/')({
  component: Language,
})

function Language() {
  return (
    <Layout>
      <Entry />
    </Layout>
  )
}
