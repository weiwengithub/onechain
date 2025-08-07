import { useGetAccountAsset } from '@/hooks/useGetAccountAsset';

import Sui from './Sui';

type EntryProps = {
  coinId: string;
  sendAmount?: string;
  sendAmountPrice?: string;
  recipientAddress?: string;
  feeAmount?: string;
};

export default function Entry({ coinId, sendAmount, sendAmountPrice, recipientAddress, feeAmount }: EntryProps) {
  const { getAccountAsset } = useGetAccountAsset({ coinId });

  const selectedAccountAsset = getAccountAsset();

  if (selectedAccountAsset?.asset.chainType === 'sui') {
    return <Sui coinId={coinId} sendAmount={sendAmount} sendAmountPrice={sendAmountPrice} recipientAddress={recipientAddress} feeAmount={feeAmount} />;
  }

  return null;
}
