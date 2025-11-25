import { useEffect, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { VoucherClient } from '@/libs/voucher/client';
import { useVoucherSigner } from '@/hooks/sui/useVoucherSigner';
import { useVoucher } from '@/zustand/hooks/useVoucher';
import type { Voucher } from '@/types/voucher';
import { toastError } from '@/utils/toast';
import { truncateVoucherCode } from '@/utils/textformat.ts';
import CopyButton from '@components/CopyButton';
import UsedIcon from '@/assets/images/onechain/icon_used.png';
import UnusedIcon from '@/assets/images/onechain/icon_unused.png';
import type { HistoryTab } from '@/pages/onetransfer/history/-entry.tsx';
import { useCurrentAccount } from '@/hooks/useCurrentAccount.ts';

export const Route = createFileRoute('/onetransfer/Voucher/VoucherList')({
  component: VoucherListRoute,
});

function VoucherListRoute() {
  return null;
}

type VoucherListItemProps = {
  voucher: Voucher;
  activeTab: HistoryTab;
};

const txBaseUrl = 'https://onescan.cc';

export function VoucherListItem({ voucher, activeTab }: VoucherListItemProps) {
  const { t } = useTranslation();
  const { chainId } = useVoucherSigner();
  const network = chainId.startsWith('oct-testnet') ? 'oct-testnet' : 'oct';
  const isTestnet = network.includes('testnet');

  const txUrl = useMemo(() => {
    return `${txBaseUrl}/${isTestnet ? 'testnet' : 'mainnet'}/transactionBlocksDetail?digest=${activeTab === 'issued' ? voucher.txDigest : voucher.redeemTxDigest}`;
  }, [activeTab, isTestnet, voucher.redeemTxDigest, voucher.txDigest]);

  return (
    <div key={voucher.id} className={''}>
      <div
        className="bg-gray-800/60 rounded-xl p-5 hover:bg-gray-800/80 transition-colors flex-row flex justify-between items-center cursor-pointer"
        onClick={() => {
          window.open(txUrl);
        }}
      >
        <div>
          <div className="flex flex-row gap-3 items-center justify-start">
            <div
              className="flex h-[30px] w-[220px] items-center justify-center rounded-lg bg-[#1E2025] text-gray-200 text-[13px] font-mono "
            >
              <span className="truncate">{truncateVoucherCode(voucher.voucherCode)}</span>
            </div>
            <CopyButton
              copyString={voucher.voucherCode}
              varient="dark"
              iconSize={{ width: 3, height: 3 }}
            />
          </div>
          <div className="flex items-center justify-between mb-3 mt-3">
            <div className="text-white text-[13px] font-medium px-1">{voucher.amount}</div>
          </div>
        </div>

        <div className="flex items-center">
          <img
            src={voucher.redeemed ? UsedIcon : UnusedIcon}
            alt={voucher.redeemed ? t('pages.onetransfer.voucher.altText.used') : t('pages.onetransfer.voucher.altText.unused')}
            className="size-[50px] object-contain"
          />
        </div>

      </div>

    </div>
  );
}

interface VoucherListProps {
  title?: string;
  list: Voucher[];
  emptyText: string;
  activeTab: HistoryTab;
}

export default function VoucherList({ title, list, emptyText, activeTab }: VoucherListProps) {
  const { t } = useTranslation();
  const { signer, chainId } = useVoucherSigner();
  const { issuedVouchers, updateIssuedVoucher } = useVoucher();

  const network = useMemo<'oct' | 'oct-testnet'>(() => {
    if (chainId.startsWith('oct-testnet')) {
      return 'oct-testnet';
    }
    return 'oct';
  }, [chainId]);

  const pendingVoucherIds = useMemo(
    () => list.filter((item) => !item.redeemed).map((item) => item.id),
    [list],
  );

  const pendingVouchers: Voucher[] = useMemo(() => {
    if (!pendingVoucherIds.length) {
      return [];
    }
    return issuedVouchers.filter((voucher) => pendingVoucherIds.includes(voucher.id));
  }, [pendingVoucherIds, issuedVouchers]);

  useEffect(() => {
    let cancelled = false;

    const syncVoucherStatus = async () => {
      if (!pendingVouchers.length || !signer) {
        return;
      }

      try {
        const client = new VoucherClient(network);
        const spentResults = await client.checkVouchersSpentStatus(pendingVouchers, signer);
        if (cancelled) {
          return;
        }

        spentResults.forEach((isSpent, index) => {
          const voucher = pendingVouchers[index];
          if (isSpent && voucher && !voucher.redeemed) {
            updateIssuedVoucher(voucher.id, {
              redeemed: true,
              redeemTime: voucher.redeemTime ?? Date.now(),
              redeemTxDigest: voucher.redeemTxDigest ?? 'detected-on-chain',
            });
          }
        });
      } catch (error) {
        if (!cancelled) {
          const message = (error as Error).message || 'Unknown error';
          toastError(t('pages.onetransfer.voucher.errors.syncFailed', { message }));
        }
      }
    };

    syncVoucherStatus();

    return () => {
      cancelled = true;
    };
  }, [network, pendingVouchers, signer, t, updateIssuedVoucher]);

  return (
    <div className="space-y-4 mt-10">
      {title && <div className="text-gray-400 text-[16px] mb-6 font-medium">{title}</div>}
      {list.map((voucher) => (
        <VoucherListItem key={voucher.id} voucher={voucher} activeTab={activeTab} />
      ))}
      {list.length === 0 && (
        <div className="text-gray-500 text-[16px] text-center">{emptyText}</div>
      )}
    </div>
  );
}
