import { useNavigate } from '@tanstack/react-router';
import type { BasicTransactionInfo } from '@/types/sui/parseTx';
import { Route as TxHistory } from '@/pages/wallet/history';
import SwapIcon from '@/assets/img/icon/wallet_home_swap.png';

type SuiPublishTxItemProps = {
  tx: BasicTransactionInfo;
  digest: string;
  coinId: string;
  timestampMs?: string | null;
};

export default function SuiPublishTxItem({
  tx: basicTransactionInfo,
  digest,
  timestampMs,
  coinId,
}: SuiPublishTxItemProps) {
  const navigate = useNavigate();

  return (
    <div
      className="border-[#2c3039] mb-[16px] flex items-center border-b border-solid pb-[16px]"
      onClick={() => {
        navigate({
          to: TxHistory.to,
          search: {
            coinId,
            txHash: digest,
            timestamp: timestampMs,
          },
        });
      }}
    >
      <div className="size-[32px] rounded-[40px] bg-[#1E2025]">
        <img className="mx-auto mt-[6px] size-[20px]" src={SwapIcon} alt="publish" />
      </div>
      <div className="ml-[8px] flex-1">
        <div className="h-[16px] text-[14px] leading-[16px] text-white">Publish</div>
        <div className="mt-[4px] h-[12px] text-[12px] leading-[12px] text-white opacity-40">Package Published</div>
      </div>
    </div>
  );
}