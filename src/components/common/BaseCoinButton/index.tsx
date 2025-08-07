import { times, formatDecimal, formatNumberWithSeparator } from '@/utils/numbers';

import { StyledButton } from './styled';
// import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore.ts';
import { usePrice } from '@/onechain/usePrice.ts';

export type BaseCoinButtonProps =
  React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>
  & {
  displayAmount: string;
  coinId?: string;
  coinGeckoId?: string;
  symbol?: string;
  disabled?: boolean;
  leftComponent?: JSX.Element;
  rightComponent?: JSX.Element;
  isActive?: boolean;
  onClick?: () => void;
};

export default function BaseCoinButton({
                                         disabled,
                                         displayAmount,
                                         coinId,
                                         coinGeckoId,
                                         leftComponent,
                                         rightComponent,
                                         isActive,
                                         onClick,
                                         ...remainder
                                       }: BaseCoinButtonProps) {

  const { chainPrice } = usePrice({ coinId, coinGeckoId });

  const value = times(displayAmount, chainPrice);

  return (
    <StyledButton onClick={onClick} data-is-active={isActive} disabled={disabled} {...remainder}>
      {leftComponent}
      <div className="flex items-center">
        <div className="flex-1 ml-[10px] flex flex-col items-end justify-end">
          <div className="flex h-[16px] text-right text-[14px] font-medium text-white">{formatNumberWithSeparator(formatDecimal(displayAmount))}</div>
          <div
            className="mt-[5px] h-[16px] text-right text-[12px] leading-[16px] text-white opacity-60"
          >${formatNumberWithSeparator(formatDecimal(value, 2))}</div>
        </div>
        {rightComponent && rightComponent}
      </div>
    </StyledButton>
  );
}
