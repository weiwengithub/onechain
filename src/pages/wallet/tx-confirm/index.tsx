import { createFileRoute } from '@tanstack/react-router'

import Entry from './-Entry'
import Layout from './-layout'

type TxConfirmSearchParams = {
  coinId: string
  sendAmount?: string;
  sendAmountPrice?: string;
  recipientAddress?: string;
  feeAmount?: string;
  feeType?: 'BASIC' | 'EIP-1559';
  gas?: string;
  gasPrice?: string;
  maxBaseFeePerGas?: string;
  maxPriorityFeePerGas?: string;
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
      feeType: search?.feeType,
      gas: search?.gas,
      gasPrice: search?.gasPrice,
      maxBaseFeePerGas: search?.maxBaseFeePerGas,
      maxPriorityFeePerGas: search?.maxPriorityFeePerGas,
    }
  },
})

function TxConfirm() {
  const searchParam = Route.useSearch()

  const {
    sendAmount,
    sendAmountPrice,
    recipientAddress,
    feeAmount,
    coinId,
    feeType,
    gas,
    gasPrice,
    maxBaseFeePerGas,
    maxPriorityFeePerGas,
  } = searchParam

  return (
    <Layout>
      <Entry
        coinId={coinId}
        sendAmount={sendAmount}
        sendAmountPrice={sendAmountPrice}
        recipientAddress={recipientAddress}
        feeAmount={feeAmount}
        feeType={feeType}
        gas={gas}
        gasPrice={gasPrice}
        maxBaseFeePerGas={maxBaseFeePerGas}
        maxPriorityFeePerGas={maxPriorityFeePerGas}
      />
    </Layout>
  )
}
