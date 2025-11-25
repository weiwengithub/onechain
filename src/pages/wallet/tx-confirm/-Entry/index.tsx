import { useGetAccountAsset } from '@/hooks/useGetAccountAsset';

import Sui from './Sui';
import EVM from './EVM';

type EntryProps = {
  coinId: string;
  sendAmount?: string;
  sendAmountPrice?: string;
  recipientAddress?: string;
  feeAmount?: string;
  feeType?: 'BASIC' | 'EIP-1559';
  gas?: string;
  gasPrice?: string;
  maxBaseFeePerGas?: string;
  maxPriorityFeePerGas?: string;
};

export default function Entry({
  coinId,
  sendAmount,
  sendAmountPrice,
  recipientAddress,
  feeAmount,
  feeType,
  gas,
  gasPrice,
  maxBaseFeePerGas,
  maxPriorityFeePerGas,
}: EntryProps) {
  const { getAccountAsset } = useGetAccountAsset({ coinId });

  const selectedAccountAsset = getAccountAsset();

  if (selectedAccountAsset?.asset.chainType === 'sui') {
    return (
      <Sui
        coinId={coinId}
        sendAmount={sendAmount}
        sendAmountPrice={sendAmountPrice}
        recipientAddress={recipientAddress}
        feeAmount={feeAmount}
      />
    );
  }

  if (selectedAccountAsset?.asset.chainType === 'evm') {
    return (
      <EVM
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
    );
  }

  return null;
}
