import type { ChangeEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';

type RedeemInputProps = {
  value: string;
  placeholder: string;
  errorMessage?: string;
  onChange: (value: string) => void;
};

export const Route = createFileRoute('/onetransfer/Voucher/RedeemInput')({
  component: RedeemInputRoute,
});

function RedeemInputRoute() {
  return null;
}

export default function RedeemInput({ value, placeholder, errorMessage, onChange }: RedeemInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="mb-8">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          style={{ fontSize: '16px', backgroundColor: '#1E2025', height: '50px' }}
          className="w-full rounded-xl px-4 text-white pr-12 focus:outline-none transition-colors"
          placeholder={placeholder}
        />
        {/*<button*/}
        {/*  onClick={() => copyToClipboard(exchangeCode)}*/}
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
    </div>
  );
}
