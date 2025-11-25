import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import VoucherList from '@/pages/onetransfer/Voucher/VoucherList';
import { useVoucher } from '@/zustand/hooks/useVoucher';
import { useVoucherSigner } from '@/hooks/sui/useVoucherSigner';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentAccountAddresses } from '@/hooks/useCurrentAccountAddresses';
import type { Voucher } from '@/types/voucher';
import DropdownSelector from '@/components/common/DropdownSelector';

export type HistoryTab = 'issued' | 'redeemed';

export default function HistoryEntry() {
  const { t } = useTranslation();
  const { issuedVouchers, redeemedVouchers } = useVoucher();
  const { chainId } = useVoucherSigner();
  const { currentAccount } = useCurrentAccount();
  const { data: addresses } = useCurrentAccountAddresses(
    currentAccount?.id ? { accountId: currentAccount.id } : {},
  );

  const [activeTab, setActiveTab] = useState<HistoryTab>('issued');
  const historyTabs = useMemo(
    () => [
      {
        key: 'issued' as HistoryTab,
        label: t('pages.onetransfer.sections.issued', { defaultValue: '已开具的支票' }),
      },
      {
        key: 'redeemed' as HistoryTab,
        label: t('pages.onetransfer.sections.redeemed', { defaultValue: '已兑换的支票' }),
      },
    ],
    [t],
  );

  const network = chainId.startsWith('oct-testnet') ? 'oct-testnet' : 'oct';

  const currentAccountAddress = useMemo(() => {
    if (!addresses) return '';

    const match = addresses.find((item) => item.chainId === network);
    if (match?.address) {
      return match.address;
    }

    const suiAddress = addresses.find((item) => item.chainType === 'sui');
    return suiAddress?.address ?? '';
  }, [addresses, network]);

  const { issuedList, redeemedList } = useMemo(() => {
    if (!currentAccountAddress) {
      return { issuedList: [] as Voucher[], redeemedList: [] as Voucher[] };
    }

    const sortByTimestampDesc = (list: Voucher[], field: 'timestamp' | 'redeemTime') =>
      [...list].sort((a, b) => Number(b[field] ?? 0) - Number(a[field] ?? 0));

    const issued = sortByTimestampDesc(
      issuedVouchers.filter(
        (voucher) => voucher.accountAddress === currentAccountAddress && voucher.network === network,
      ),
      'timestamp',
    );

    const redeemed = sortByTimestampDesc(
      redeemedVouchers.filter(
        (voucher) => voucher.accountAddress === currentAccountAddress && voucher.network === network,
      ),
      'redeemTime',
    );

    return { issuedList: issued, redeemedList: redeemed };
  }, [currentAccountAddress, network, issuedVouchers, redeemedVouchers]);

  const displayedVouchers = useMemo(() => {
    return activeTab === 'issued' ? issuedList : redeemedList;
  }, [activeTab, issuedList, redeemedList]);

  console.log('        displayedVouchers', displayedVouchers);

  const emptyText =
    activeTab === 'issued'
      ? t('pages.onetransfer.empty.issued')
      : t('pages.onetransfer.empty.redeemed');

  return (
    <BaseBody>
      <DropdownSelector
        options={historyTabs}
        selectedKey={activeTab}
        onSelect={setActiveTab}
        containerClassName="inline-block text-[14px]"
        buttonClassName="mx-0"
        menuClassName="min-w-[180px]"
      />

      <VoucherList
        list={displayedVouchers}
        emptyText={emptyText}
        activeTab={activeTab}
      />
    </BaseBody>
  );
}
