import { createFileRoute } from '@tanstack/react-router'

import Entry from './-Entry'
import Layout from './-layout'

type TxConfirmSearchParams = {
  coinId: string
  txHash?: string
  timestamp?: string | null
  isSender?: boolean
  displayAmount?: string
  symbol?: string
  address?: string
}

export const Route = createFileRoute('/wallet/history/')({
  component: TxHistory,
  validateSearch: (search?: TxConfirmSearchParams): TxConfirmSearchParams => {
    return {
      coinId: search?.coinId || '',
      txHash: search?.txHash,
      timestamp: search?.timestamp,
      isSender: search?.isSender,
      displayAmount: search?.displayAmount,
      symbol: search?.symbol,
      address: search?.address,
    }
  },
})

function TxHistory() {
  const searchParam = Route.useSearch()

  const { txHash, timestamp, isSender, displayAmount, symbol, address, coinId } =
    searchParam

  return (
    <Layout>
      <Entry
        coinId={coinId}
        txHash={txHash}
        timestamp={timestamp}
        isSender={isSender}
        displayAmount={displayAmount}
        symbol={symbol}
        address={address}
      />
    </Layout>
  )
}
