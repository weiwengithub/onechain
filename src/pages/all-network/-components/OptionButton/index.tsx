import { forwardRef } from 'react';

// import BaseOptionButton from '@/components/common/BaseOptionButton';
import type { UniqueChainId } from '@/types/chain';

// import { ActiveBadge, ChainImage, ChainNameText } from './styled';

// import CheckIcon from 'assets/images/icons/Check.svg';
import CheckedIcon from "@/assets/img/icon/checked.png";
import NetworkIcon from '@/assets/images/network.png';

type OptionButtonProps = {
  image: string | null;
  name: string;
  id?: UniqueChainId;
  isActive?: boolean;
  isShowValue?: boolean;
  totalValue?: string;
  onSelectChain?: (id?: UniqueChainId) => void;
};

const OptionButton = forwardRef<HTMLButtonElement, OptionButtonProps>(
  ({ image, name, isActive, id, isShowValue, totalValue, onSelectChain }) => {
    return (
      <div
        className="mb-[24px] h-[36px] flex items-center"
        onClick={() => {
          onSelectChain?.(id);
        }}
      >
        <img
          src={image || NetworkIcon}
          alt={name}
          className="size-[36px]"
        />
        <div className="ml-[8px] flex-1">
          <div className="h-[16px] text-white text-[16px] leading-[16px] font-bold">{name}</div>
          {isShowValue && (<div className="mt-[2px] h-[16px] text-white text-[12px] leading-[16px] opacity-[60]">{totalValue}</div>)}
        </div>
        {isActive && (<img className="ml-[8px] size-[18px]" src={CheckedIcon} alt="checked" />)}
      </div>
    );
  },
);

OptionButton.displayName = 'OptionButton';

export default OptionButton;
