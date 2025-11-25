import { useState } from 'react';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import { useChainList } from '@/hooks/useChainList.ts';
import { useCurrentAccountAddresses } from '@/hooks/useCurrentAccountAddresses.ts';
import { useCurrentPreferAccountTypes } from '@/hooks/useCurrentPreferAccountTypes.ts';
import { useClipboard } from '@/hooks/useClipboard';
import type { UniqueChainId } from '@/types/chain.ts';
import {
  getUniqueChainIdWithManual,
  isMatchingUniqueChainId,
  parseUniqueChainId,
} from '@/utils/queryParamGenerator.ts';

import {
  Container,
} from './-styled.tsx';

import { QRCode } from '@components/onechain/QRCode.tsx';
import { toastDefault, toastError } from '@/utils/toast.tsx';
import { Trans, useTranslation } from 'react-i18next';

type EntryProps = {
  chainId: UniqueChainId;
};

export default function Entry({ chainId }: EntryProps) {
  const { t } = useTranslation();
  const { copyToClipboard } = useClipboard();
  const [tabValue] = useState(0);

  const { currentPreferAccountType } = useCurrentPreferAccountTypes();
  const { flatChainList } = useChainList();
  const accountAddress = useCurrentAccountAddresses();

  const parsedUniqueChainId = parseUniqueChainId(chainId);

  const multiPath = (() => {
    return currentPreferAccountType?.[parsedUniqueChainId.id];
  })();

  const newChainId = (() => {
    if (parsedUniqueChainId.chainType === 'evm' || parsedUniqueChainId.chainType === 'cosmos') {
      const currentChainAccountType = currentPreferAccountType?.[parsedUniqueChainId.id];

      if (currentChainAccountType) {
        const chainType = currentChainAccountType.pubkeyStyle === 'secp256k1' ? 'cosmos' : 'evm';

        const newUniqueChainId = getUniqueChainIdWithManual(parsedUniqueChainId.id, chainType);
        return newUniqueChainId;
      }
    }

    return chainId;
  })();

  const selectedChain = flatChainList.find((chain) => isMatchingUniqueChainId(chain, newChainId));

  const isEthermint = selectedChain?.chainType === 'evm' && selectedChain.isCosmos;

  const chainAddress = (() => {
    if (isEthermint) {
      if (tabValue === 0) {
        const addr = accountAddress.data?.find((item) => {
          const isSameChain = getUniqueChainIdWithManual(item.chainId, item.chainType) === newChainId;
          const isSameAccountType = multiPath ? item.accountType.hdPath === multiPath.hdPath : true;

          return isSameChain && isSameAccountType;
        });

        return addr;
      }
      if (tabValue === 1) {
        const addr = accountAddress.data?.find((item) => {
          const isSameChain =
            getUniqueChainIdWithManual(item.chainId, item.chainType) === getUniqueChainIdWithManual(parseUniqueChainId(newChainId).id, 'cosmos');
          const isSameAccountType = multiPath ? item.accountType.hdPath === multiPath.hdPath : true;

          return isSameChain && isSameAccountType;
        });

        return addr;
      }
    }

    return accountAddress.data?.find((item) => {
      const isSameChain = getUniqueChainIdWithManual(item.chainId, item.chainType) === newChainId;
      const isSameAccountType = multiPath ? item.accountType.hdPath === multiPath.hdPath : true;

      return isSameChain && isSameAccountType;
    });
  })();

  return (
    <BaseBody>
      <Container>
        <div className="m-auto size-[200px] overflow-hidden rounded-[18px] bg-white">
          <div className="size-[200px]">
            <QRCode
              data={chainAddress?.address || ''}
              width={200}
              height={200}
            />
          </div>
        </div>
        <div
          className="m-auto mt-[12px] w-[208px] px-[4px] text-center text-[14px] leading-[16px] text-[rgba(255,255,255,0.6)]"
        >
          <Trans
            i18nKey="pages.wallet.receive.chain.index.networkWarning"
            values={{
              network: selectedChain?.name || '',
            }}
            components={{
              network: <span className="mr-[4px] ml-[4px] text-white" />,
            }}
          />
        </div>
        <div
          className="m-auto mt-[40px] w-[240px] px-[12px] text-center text-[14px] leading-[16px] text-white break-all"
        >{chainAddress?.address || ''}</div>
        <div
          className="mt-[24px] w-full h-[50px] bg-[#0047C4] rounded-[12px] text-center leading-[50px] text-white text-[16px] font-bold hover:bg-[#3B82FF] cursor-pointer"
          onClick={() => chainAddress?.address && copyToClipboard(chainAddress.address)}
        >
          {t('pages.wallet.receive.chain.index.copyAddress')}
        </div>
      </Container>
    </BaseBody>
  );
}
