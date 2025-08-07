import { createFileRoute } from '@tanstack/react-router'

import Entry from './-Entry'
import Layout from './-layout'

type TxConfirmSearchParams = {
  coinId: string
  sendAmount?: string;
  sendAmountPrice?: string;
  recipientAddress?: string;
  feeAmount?: string;
}

export const Route = createFileRoute('/wallet/tx-confirm/')({
  component: TxConfirm,
  validateSearch: (search?: TxConfirmSearchParams): TxConfirmSearchParams => {
    return {
      coinId: search?.coinId || '',
      sendAmount: search?.sendAmount,
      sendAmountPrice: search?.sendAmountPrice,
      recipientAddress: search?.recipientAddress,
      feeAmount: search?.feeAmount,
    }
  },
})

function TxConfirm() {
  const searchParam = Route.useSearch()

  const { sendAmount, sendAmountPrice, recipientAddress, feeAmount, coinId } = searchParam

  return (
    <Layout>
      <Entry coinId={coinId} sendAmount={sendAmount} sendAmountPrice={sendAmountPrice} recipientAddress={recipientAddress} feeAmount={feeAmount} />
    </Layout>
  )
}
