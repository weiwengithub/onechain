import type { ChangeEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { isValidSuiAddress } from '@mysten/sui/utils';

type ReceiverInputProps = {
  value: string;
  label: string;
  placeholder: string;
  errorMessage?: string;
  invalidAddressMessage: string;
  serviceFeeText: string;
  onChange: (value: string) => void;
};

export const Route = createFileRoute('/onetransfer/RedPacket/ReceiverInput')({
  component: ReceiverInputRoute,
});

function ReceiverInputRoute() {
  return null;
}

export default function ReceiverInput({
  value,
  label,
  placeholder,
  errorMessage,
  invalidAddressMessage,
  serviceFeeText,
  onChange,
}: ReceiverInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const isAddressInvalid = value.trim() && !isValidSuiAddress(value.trim());

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-white mb-3">
        <span className="text-[16px] font-medium">{label}</span>
      </div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          style={{ fontSize: '16px', backgroundColor: '#1E2025', height: '50px' }}
          className={`w-full rounded-xl px-4 text-white pr-12 focus:outline-none transition-colors ${
            isAddressInvalid ? 'border border-red-400' : ''
          }`}
          placeholder={placeholder}
        />
        {/*<button*/}
        {/*  onClick={() => copyToClipboard(receiver)}*/}
        {/*  className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:text-gray-300 transition-colors"*/}
        {/*>*/}
        {/*  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
        {/*    <path*/}
        {/*      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}*/}
        {/*      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"*/}
        {/*    />*/}
        {/*  </svg>*/}
        {/*</button>*/}
      </div>
      {errorMessage && (
        <div className="text-red-400 text-[16px] mt-2">{errorMessage}</div>
      )}
      {isAddressInvalid && !errorMessage && (
        <div className="text-red-400 text-[16px] mt-2">{invalidAddressMessage}</div>
      )}
      <div className="text-gray-400 text-[16px] mt-6">
        {serviceFeeText}
      </div>
    </div>
  );
}
