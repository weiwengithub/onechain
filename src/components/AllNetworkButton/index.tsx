import { useState } from 'react';

import type { TypoVariantKeys } from '@/styles/theme';
import type { ChainBase, UniqueChainId } from '@/types/chain';
import { isMatchingUniqueChainId } from '@/utils/queryParamGenerator';

import { ChainImageContainer, GridMenuIconContainer, StyledIconButton } from './styled';
import ChainListBottomSheet from '../ChainListBottomSheet';
import type { IconTextButtonProps } from '../common/IconTextButton';

import AllNetworkIcon from '@/assets/images/network.png';

type AllNetworkButtonprops = IconTextButtonProps & {
  typoVarient?: TypoVariantKeys;
  variant?: 'normal' | 'chip';
  currentChainId?: UniqueChainId;
  chainList?: ChainBase[];
  isManageAssets?: boolean;
  isWithValue?: boolean;
  sizeVariant?: 'small' | 'medium' | 'large';
  selectChainOption?: (id?: UniqueChainId) => void;
};

export default function AllNetworkButton({
  typoVarient = 'b2_M',
  variant = 'normal',
  currentChainId,
  chainList,
  isManageAssets = false,
  isWithValue = false,
  sizeVariant,
  selectChainOption,
  ...remainder
}: AllNetworkButtonprops) {
  const [isOpenChainListBottomSheet, setIsOpenChainListBottomSheet] = useState(false);

  const currentChain = chainList?.find((chain) => isMatchingUniqueChainId(chain, currentChainId));
  return (
    <>
      <StyledIconButton
        variants={variant}
        leadingIcon={
          currentChain ? (
            <ChainImageContainer sizeVariant={sizeVariant || 'large'} src={currentChain.image || ''} />
          ) : (
            <GridMenuIconContainer sizeVariant={sizeVariant || 'large'}>
              <img src={AllNetworkIcon} alt="allNetwork" className="size-full" />
            </GridMenuIconContainer>
          )
        }
        onClick={() => {
          setIsOpenChainListBottomSheet(true);
        }}
        {...remainder}
      >
      </StyledIconButton>
      <ChainListBottomSheet
        currentChainId={currentChainId}
        chainList={chainList || []}
        open={isOpenChainListBottomSheet}
        onClose={() => setIsOpenChainListBottomSheet(false)}
        customType={isManageAssets ? 'manageAssets' : 'normal'}
        isShowValue={isWithValue}
        buttonVarients={isWithValue ? 'label' : undefined}
        onClickChain={(id) => {
          selectChainOption?.(id);
        }}
      />
    </>
  );
}
