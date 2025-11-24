import { createFileRoute } from '@tanstack/react-router';

type ActionButtonProps = {
  buttonText: string;
  loadingText: string;
  isBusy: boolean;
  isButtonDisabled: boolean;
  errorMessage?: string;
  showProofGenerating: boolean;
  proofGeneratingText: string;
  onClick: () => void;
};

export const Route = createFileRoute('/onetransfer/Voucher/ActionButton')({
  component: ActionButtonRoute,
});

function ActionButtonRoute() {
  return null;
}

export default function ActionButton({
  buttonText,
  loadingText,
  isBusy,
  isButtonDisabled,
  errorMessage,
  showProofGenerating,
  proofGeneratingText,
  onClick,
}: ActionButtonProps) {
  return (
    <div>
      <div
        className={`mt-[16px] w-full h-[50px] rounded-[12px] text-center leading-[50px] text-[16px] font-bold ${
          isButtonDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-[#0047C4] text-white hover:bg-[#3B82FF] cursor-pointer'
        }`}
        onClick={isButtonDisabled ? undefined : onClick}
      >
        {isBusy ? loadingText : buttonText}
      </div>
      {errorMessage && (
        <div className="text-red-400 text-[16px] mt-2 mb-6">{errorMessage}</div>
      )}
      {showProofGenerating && (
        <div className="text-blue-400 text-[16px] mt-3 flex items-center">
          <svg
            className="animate-spin h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {proofGeneratingText}
        </div>
      )}
    </div>
  );
}
