import { useState } from 'react';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import { useChainList } from '@/hooks/useChainList.ts';
import { useCurrentAccountAddresses } from '@/hooks/useCurrentAccountAddresses.ts';
import { useCurrentPreferAccountTypes } from '@/hooks/useCurrentPreferAccountTypes.ts';
import type { UniqueChainId } from '@/types/chain.ts';
import { getUniqueChainIdWithManual, isMatchingUniqueChainId, parseUniqueChainId } from '@/utils/queryParamGenerator.ts';

import {
  Container,
} from './-styled.tsx';

import { QRCode } from '@components/onechain/QRCode.tsx';
import { toastDefault, toastError } from '@/utils/toast.tsx';
import { useTranslation } from 'react-i18next';
import copy from 'copy-to-clipboard';

type EntryProps = {
  chainId: UniqueChainId;
};

export default function Entry({ chainId }: EntryProps) {
  const { t } = useTranslation();
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

  const copyToClipboard = () => {
    if (chainAddress?.address && copy(chainAddress.address)) {
      toastDefault(t('components.MainBox.CoinDetailBox.index.copied'));
    } else {
      toastError(t('components.MainBox.CoinDetailBox.index.copyFailed'));
    }
  };

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
        <div className="m-auto mt-[12px] w-[208px] px-[4px] text-center text-[14px] leading-[16px] text-[rgba(255,255,255,0.6)]">
          Send only <span className="mr-[4px] ml-[4px] text-white">{selectedChain?.name || ''} testnet</span>
          assets to this address
        </div>
        <div className="m-auto mt-[40px] w-[240px] px-[12px] text-center text-[14px] leading-[16px] text-white break-all">{chainAddress?.address || ''}</div>
        <div
          className="m-auto mt-[14px] w-[288px] h-[36px] rounded-lg border border-solid border-[#1E2025] text-center leading-[36px] text-[#0047C4]"
          onClick={copyToClipboard}
        >
          Copy Address
        </div>
      </Container>
    </BaseBody>
  );
}
