import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import sleep from 'sleep-promise';

import Base1300Text from '@/components/common/Base1300Text';
import EmptyAsset from '@/components/EmptyAsset';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { Route as Home } from '@/pages/index';
import { toastSuccess } from '@/utils/toast';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import type { ZkLoginAccount } from '@/types/account';
import GoogleLogo from '@/assets/images/logos/g.webp';
import AppleLogo from '@/assets/images/logos/apple.png';

import {
  AccountButton,
  AccountImgContainer,
  AccountInfoContainer,
  AccountLeftContainer,
  AccountRightContainer,
  ActiveBadge,
  BodyContainer,
  Container,
  EmptyAssetContainer,
} from './styled';

import CheckIcon from 'assets/images/icons/Check.svg';

type ZkLoginAccountProps = {
  search?: string;
};

export default function ZkLoginAccount({ search }: ZkLoginAccountProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentAccount, setCurrentAccount } = useCurrentAccount();

  const { userAccounts, accountNamesById } = useExtensionStorageStore((state) => state);

  const zkLoginAccounts = userAccounts
    .filter((item) => item.type === 'ZKLOGIN')
    .map((item) => ({
      ...item,
      accountName: accountNamesById[item.id] ?? '',
    }));

  const filteredAccounts = useMemo(() => {
    if (search) {
      return (
        zkLoginAccounts.filter((account) => {
          const condition = [account.accountName];

          return condition.some((item) => item.toLowerCase().indexOf(search.toLowerCase()) > -1);
        }) || []
      );
    }
    return zkLoginAccounts;
  }, [zkLoginAccounts, search]);

  if (filteredAccounts.length === 0) {
    return (
      <EmptyAssetContainer>
        <EmptyAsset
          icon={<img src={GoogleLogo} alt="ZkLogin" className="size-[70px]" />}
          title={t('pages.manage-account.switch-account.entry.zkLoginAccount')}
          subTitle={t('pages.manage-account.switch-account.entry.zkLoginAccountDescription')}
        />
      </EmptyAssetContainer>
    );
  }

  return (
    <Container>
      <BodyContainer>
        {filteredAccounts.map((item, i) => {
          const isCurrentAccount = currentAccount?.id === item.id;

          return (
            <AccountButton
              key={i}
              onClick={async () => {
                setCurrentAccount(item.id);

                await sleep(200);

                navigate({
                  to: Home.to,
                });

                toastSuccess(
                  t('pages.manage-account.switch-account.components.switchAccountSuccess', {
                    accountName: item.accountName,
                  }),
                );
              }}
            >
              <AccountLeftContainer>
                <AccountImgContainer>
                  <div className="flex size-[28px] rounded-full bg-white items-center justify-center">
                    <img
                      className="size-[18px]"
                      src={(item as ZkLoginAccount).provider === 'apple' ? AppleLogo : GoogleLogo}
                      alt={(item as ZkLoginAccount).provider === 'apple' ? 'Apple' : 'Google'}
                    />
                  </div>
                </AccountImgContainer>

                <AccountInfoContainer>
                  <Base1300Text variant="b2_M">{item.accountName}</Base1300Text>
                </AccountInfoContainer>
              </AccountLeftContainer>
              <AccountRightContainer>
                {isCurrentAccount && (
                  <ActiveBadge>
                    <CheckIcon />
                  </ActiveBadge>
                )}
              </AccountRightContainer>
            </AccountButton>
          );
        })}
      </BodyContainer>
    </Container>
  );
}
