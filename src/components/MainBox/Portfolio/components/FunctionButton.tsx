import type React from 'react';
import { CircularProgress } from '@mui/material';

type Props = {
  onClick: () => void;
  imageSrc: string;
  name: string;
  loading?: boolean;
  disabled?: boolean;
} & React.ComponentProps<'div'>;

export const FunctionButton = (props: Props) => {
  const { name, imageSrc, onClick, loading, disabled, ...rest } = props;

  return (
    <div
      className={`flex size-[72px] flex-col items-center rounded-[8px] pr-[12px] pl-[12px] leading-[40px] ${
        disabled
          ? 'bg-[#1a1d24]'
          : 'bg-[#2C3039] cursor-pointer hover:bg-[#0047C4]'
      }`}
      onClick={!disabled ? onClick : undefined}
    >
      {loading ? (
        <CircularProgress size={24} sx={{ color: '#ffffff', marginTop: '12px' }} />
      ) : (
        <img
          className="mx-auto mt-[12px] size-[24px] "
          src={imageSrc}
          alt={name}
        />
      )}
      <div className="mt-[8px] h-[20px] text-white text-center text-[14px] leading-[20px]">
        {name}
      </div>
    </div>
  );
};
