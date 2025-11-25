import { createFileRoute } from '@tanstack/react-router';

import CustomSelect from '@/components/common/CustomSelect';

type AmountInputProps = {
  label: string;
  value: string;
  options: string[];
  errorMessage?: string;
  onChange: (value: string) => void;
};

export const Route = createFileRoute('/onetransfer/RedPacket/AmountInput')({
  component: AmountInputRoute,
});

function AmountInputRoute() {
  return null;
}

export default function AmountInput({
  label,
  value,
  options,
  errorMessage,
  onChange,
}: AmountInputProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-white mb-3">
        <span className="text-[16px] font-medium">{label}</span>
      </div>
      <CustomSelect
        value={value}
        options={options}
        onChange={onChange}
      />
      {errorMessage && (
        <div className="text-red-400 text-[16px] mt-2">{errorMessage}</div>
      )}
    </div>
  );
}
