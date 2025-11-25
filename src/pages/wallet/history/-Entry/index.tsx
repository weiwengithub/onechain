import { useGetAccountAsset } from '@/hooks/useGetAccountAsset';

import Sui from './Sui';

type EntryProps = {
  coinId: string;
  txHash?: string
  timestamp?: string | null
  isSender?: boolean
  displayAmount?: string
  symbol?: string
  address?: string
};

export default function Entry({ coinId, txHash, timestamp, isSender, displayAmount, symbol, address }: EntryProps) {
  const { getAccountAsset } = useGetAccountAsset({ coinId });

  const selectedAccountAsset = getAccountAsset();

  if (selectedAccountAsset?.asset.chainType === 'sui') {
    return <Sui
      coinId={coinId}
      txHash={txHash}
      timestamp={timestamp}
      isSender={isSender}
      displayAmount={displayAmount}
      symbol={symbol}
      address={address}
    />;
  }

  return null;
}
