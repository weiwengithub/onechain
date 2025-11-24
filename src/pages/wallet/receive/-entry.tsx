import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import CoinSelect from '@/components/CoinSelect';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets';
import { Route as Receive } from '@/pages/wallet/receive/$coinId';
import { useMemo } from 'react';
import type { FlatAccountAssets } from '@/types/accountAssets.ts';

export default function Entry() {
  const navigate = useNavigate();
  const { data: accountAllAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
  });

  const coinList = useMemo(() => {
    const assets = accountAllAssets?.flatAccountAssets;
    const res: FlatAccountAssets[] = [];
    if (assets && assets.length > 0) {
      assets.forEach((item) => {
        if (item.asset.chainType === 'sui') {
          res.push(item);
        }
      })
    }
      return res;
    }, [accountAllAssets]);

  console.log("      coinList", coinList);

  return (
    <BaseBody>
      <EdgeAligner>
        <CoinSelect
          // coinList={accountAllAssets?.flatAccountAssets}
          coinList={coinList}
          onSelectCoin={(coinId) => {
            navigate({
              to: Receive.to,
              params: {
                coinId: coinId,
              },
            });
          }}
        />
      </EdgeAligner>
    </BaseBody>
  );
}
