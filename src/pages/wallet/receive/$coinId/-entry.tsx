import { useEffect, useState } from 'react';
// import copy from 'copy-to-clipboard';
// import { QRCodeSVG } from 'qrcode.react';
// import { Typography } from '@mui/material';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
// import TextButton from '@/components/common/TextButton/index.tsx';
import { NATIVE_EVM_COIN_ADDRESS } from '@/constants/evm.ts';
import { useAccountAllAssets } from '@/hooks/useAccountAllAssets.ts';
import { useClipboard } from '@/hooks/useClipboard';
import { isTestnetChain } from '@/utils/chain.ts';
import { getCoinId } from '@/utils/queryParamGenerator.ts';
import { isEqualsIgnoringCase } from '@/utils/string.ts';
// import { toastDefault } from '@/utils/toast.tsx';

import {
  Container,
} from './-styled.tsx';

// import BottomLeftCornerStrokeIcon from '@/assets/images/icons/BorderStroke27.svg';
import { QRCode } from '@components/onechain/QRCode.tsx';
import { useTranslation } from 'react-i18next';

type EntryProps = {
  coinId: string;
};

export default function Entry({ coinId }: EntryProps) {
  const { t } = useTranslation();
  const { copyToClipboard } = useClipboard();
  const [tabValue] = useState(0);

  const { data: currentAccountAssets } = useAccountAllAssets({
    filterByPreferAccountType: true,
    disableDupeEthermint: true,
  });

  const selectedCoin = currentAccountAssets?.flatAccountAssets && currentAccountAssets.flatAccountAssets.find(({ asset }) => getCoinId(asset) === coinId);

  const isEthermint = selectedCoin?.chain.chainType === 'evm' && selectedCoin.chain.isCosmos;

  const isMainCoin = isEqualsIgnoringCase(selectedCoin?.asset.id, NATIVE_EVM_COIN_ADDRESS);

  const isShowCosmosStyle = isEthermint && isMainCoin;

  const cosmosStyleCoin = isShowCosmosStyle
    ? currentAccountAssets?.cosmosAccountAssets.find(
        (item) =>
          item.asset.id === selectedCoin.chain.mainAssetDenom &&
          item.chain.id === selectedCoin.chain.id &&
          item.address.chainId === selectedCoin.address.chainId &&
          item.address.accountType.hdPath === selectedCoin.address.accountType.hdPath,
      )
    : undefined;

  const symbol = selectedCoin?.asset.symbol ? selectedCoin.asset.symbol + `${isTestnetChain(selectedCoin.chain.id) ? ' (Testnet)' : ''}` : '';

  const chainAddress = (() => {
    if (isShowCosmosStyle) {
      if (tabValue === 0) {
        return selectedCoin.address.address;
      }
      if (tabValue === 1) {
        return cosmosStyleCoin?.address.address || '';
      }
    }

    return selectedCoin?.address.address || '';
  })();

  const chainName = selectedCoin?.chain.name || '';

  console.log(chainName);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <BaseBody>
      <Container>
        <div className="m-auto size-[200px] overflow-hidden rounded-[18px] bg-white">
          <div className="size-[200px]">
            <QRCode
              data={chainAddress}
              width={200}
              height={200}
            />
          </div>
        </div>
        <div className="m-auto mt-[12px] w-[208px] px-[4px] text-center text-[14px] leading-[16px] text-[rgba(255,255,255,0.6)]">
          Send only <span className="mr-[4px] ml-[4px] text-white">{symbol} network</span>
          assets to this address
        </div>
        <div className="m-auto mt-[40px] w-[240px] px-[12px] text-center text-[14px] leading-[16px] text-white break-all">{chainAddress}</div>
        <div
          className="mt-[24px] w-full h-[50px] bg-[#0047C4] rounded-[12px] text-center leading-[50px] text-white text-[16px] font-bold hover:bg-[#3B82FF] cursor-pointer"
          onClick={() => chainAddress && copyToClipboard(chainAddress)}
        >
          Copy Address
        </div>
      </Container>
    </BaseBody>
  );
}
