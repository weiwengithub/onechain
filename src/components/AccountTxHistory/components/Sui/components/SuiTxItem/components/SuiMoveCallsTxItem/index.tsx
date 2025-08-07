import { useNavigate } from '@tanstack/react-router';
import type { MoveCallTransactionInfo } from '@/types/sui/parseTx';
import { capitalize } from '@/utils/string';
import { Route as TxHistory } from '@/pages/wallet/history';
import FunctionIcon from '@/assets/img/icon/wallet_home_swap.png';

type SuiMoveCallsTxItemProps = {
  tx: MoveCallTransactionInfo;
  digest: string;
  coinId: string;
  timestampMs?: string | null;
};

export default function SuiMoveCallsTxItem({
                                             tx: moveCallTransactionInfo,
                                             digest,
                                             timestampMs,
                                             coinId,
                                           }: SuiMoveCallsTxItemProps) {
  const navigate = useNavigate();
  const { moduleName, functionName } = moveCallTransactionInfo;

  const detail = (() => {
    const title = `${capitalize(moduleName)} ${capitalize(functionName)}`;

    return {
      title,
    };
  })();

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
        <img className="mx-auto mt-[6px] size-[20px]" src={FunctionIcon} alt="function" />
      </div>
      <div className="ml-[8px] flex-1">
        <div className="h-[16px] text-[14px] leading-[16px] text-white">{detail.title}</div>
        <div className="mt-[4px] h-[12px] text-[12px] leading-[12px] text-white opacity-40">Function Call</div>
      </div>
      <div className="ml-[8px] h-[16px] text-[14px] leading-[16px] font-bold text-white">
        -
      </div>
    </div>
  );
}
