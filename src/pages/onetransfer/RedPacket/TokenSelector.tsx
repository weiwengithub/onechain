import { createFileRoute } from '@tanstack/react-router';

import CustomSelect from '@/components/common/CustomSelect';

type TokenOption = {
  value: string;
  label: string;
};

type TokenSelectorProps = {
  label: string;
  value: string;
  options: TokenOption[];
  disabled?: boolean;
  balanceText: string;
  onChange: (value: string) => void;
};

export const Route = createFileRoute('/onetransfer/RedPacket/TokenSelector')({
  component: TokenSelectorRoute,
});

function TokenSelectorRoute() {
  return null;
}

export default function TokenSelector({
  label,
  value,
  options,
  disabled,
  balanceText,
  onChange,
}: TokenSelectorProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-white mb-3">
        <span className="text-[16px] font-medium">{label}</span>
      </div>
      <CustomSelect
        value={value}
        options={options}
        onChange={onChange}
        disabled={disabled}
      />
      <div className="text-gray-400 text-[16px] mt-3">
        {balanceText}
      </div>
    </div>
  );
}
