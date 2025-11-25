import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import sleep from 'sleep-promise';
import { v4 as uuidv4 } from 'uuid';

import EmptyAsset from '@/components/EmptyAsset';
import VerifyPasswordBottomSheet from '@/components/VerifyPasswordBottomSheet';
import Base1300Text from '@/components/common/Base1300Text';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { Route as Home } from '@/pages/index';
import { Route as ManageBackupStep1 } from '@/pages/manage-account/backup-wallet/step1/$accountId';
import { Route as CreateAccountWithExistMnemonic } from '@/pages/manage-account/create-account/$mnemonicId';
import { toastError, toastSuccess } from '@/utils/toast';
import { getShortAddress } from '@/utils/string';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import Avatar from 'boring-avatars';
import GoogleLogo from '@/assets/images/logos/g.webp';
import ArrowRightIcon from '@/assets/img/icon/arrow_right_16.png';
import type { AccountWithName, ZkLoginAccount } from '@/types/account.ts';
import { addPreferAccountType } from '@/utils/zustand/preferAccountType.ts';
import AppleLogo from '@/assets/images/logos/apple.png';

import {
  AllAccountBody,
  AccountButton,
  AddAccountButton,
  BodyContainer,
  Container,
  EmptyAssetContainer,
  OutlinedButtonContainer,
  RightArrowIconContainer,
  StyledOutlinedButton,
  TopContainer,
  ZkLoginAccountButton,
  ZkLoginContainer,
  PrivateKeyContainer,
} from './styled';

import ImportMnemonicIcon from '@/assets/images/icons/ImportMnemonic70.svg';
import RightArrowIcon from '@/assets/images/icons/RightArrow14.svg';
import CheckIcon from 'assets/img/icon/checked.png';

type AllAccountProps = {
  search?: string;
};

export default function AllAccount({ search }: AllAccountProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [supposedToBackupAccountId, setSupposedToBackupAccountId] = useState<string | undefined>();

  const { currentAccount, setCurrentAccount, addAccountWithName } = useCurrentAccount();
  const {
    userAccounts,
    accountNamesById,
    mnemonicNamesByHashedMnemonic,
    notBackedUpAccountIds,
  } = useExtensionStorageStore((state) => state);

  // ZkLogin Accounts
  const zkLoginAccounts = useMemo(() => {
    return userAccounts
      .filter((item) => item.type === 'ZKLOGIN')
      .map((item) => ({
        ...item,
        accountName: accountNamesById[item.id] ?? '',
      }));
  }, [userAccounts, accountNamesById]);

  // Mnemonic Accounts (grouped by mnemonic)
  const mnemonicAccounts = useMemo(
    () =>
      userAccounts
        .filter((item) => item.type === 'MNEMONIC')
        .map((account) => ({
          encryptedRestoreString: account.encryptedRestoreString,
          mnemonicName: mnemonicNamesByHashedMnemonic[account.encryptedRestoreString] || '',
          lastHdPath: account.index,
          isNotBackedUp: notBackedUpAccountIds.includes(account.id),
          accounts: userAccounts
            .filter((item) => item.type === 'MNEMONIC' && item.encryptedRestoreString === account.encryptedRestoreString)
            .map((item) => ({
              ...item,
              accountName: accountNamesById[item.id],
            })),
        }))
        .filter((value, index, self) => self.findIndex((tx) => tx.encryptedRestoreString === value.encryptedRestoreString) === index),
    [accountNamesById, mnemonicNamesByHashedMnemonic, notBackedUpAccountIds, userAccounts],
  );

  // Private Key Accounts
  const privateKeyAccounts = useMemo(() => {
    return userAccounts
      .filter((item) => item.type === 'PRIVATE_KEY')
      .map((item) => ({
        ...item,
        accountName: accountNamesById[item.id] ?? '',
      }));
  }, [userAccounts, accountNamesById]);

  // Filter accounts based on search
  const filteredZkLoginAccounts = useMemo(() => {
    if (!search) return zkLoginAccounts;
    return zkLoginAccounts.filter((account) =>
      account.accountName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [zkLoginAccounts, search]);

  const filteredMnemonicAccounts = useMemo(() => {
    if (!mnemonicAccounts) return [];
    if (!search) return mnemonicAccounts;

    const lowerSearch = search.toLowerCase();
    return mnemonicAccounts
      .map(({ mnemonicName, accounts, ...rest }) => {
        const matchesMnemonicName = mnemonicName.toLowerCase().includes(lowerSearch);
        const filteredAccounts = accounts.filter((acc) => (acc.accountName ?? '').toLowerCase().includes(lowerSearch));

        if (matchesMnemonicName || filteredAccounts.length > 0) {
          return {
            ...rest,
            mnemonicName,
            accounts: filteredAccounts.length > 0 ? filteredAccounts : accounts,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [mnemonicAccounts, search]);

  const filteredPrivateKeyAccounts = useMemo(() => {
    if (!search) return privateKeyAccounts;
    return privateKeyAccounts.filter((account) =>
      account.accountName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [privateKeyAccounts, search]);

  // Handle account switching
  const handleSwitchAccount = async (accountId: string, accountName: string) => {
    setCurrentAccount(accountId);
    await sleep(200);
    navigate({ to: Home.to });
    toastSuccess(
      t('pages.manage-account.switch-account.components.switchAccountSuccess', {
        accountName,
      }),
    );
  };

  // Handle add account for mnemonic
  const handleClickAddAccount = async (mnemonicId: string, index = 0) => {
    const mnemonicAccount = userAccounts.find((account) => account.type === 'MNEMONIC' && account.encryptedRestoreString === mnemonicId);
    if (!mnemonicAccount) {
      toastError(t('pages.manage-account.create-account.entry.failToFindMnemonic'));
      return;
    }

    if (mnemonicAccount?.type === 'MNEMONIC') {
      const accountId = uuidv4();
      const nextIndex = index + 1;
      const newAccount: AccountWithName = {
        id: accountId,
        type: 'MNEMONIC',
        name: t('pages.manage-account.switch-account.components.accountName', { index: nextIndex }),
        index: nextIndex.toString(),
        encryptedMnemonic: mnemonicAccount.encryptedMnemonic,
        encryptedRestoreString: mnemonicAccount.encryptedRestoreString,
      };

      await addAccountWithName(newAccount);
      await addPreferAccountType(newAccount.id);
      toastSuccess(t('pages.manage-account.create-account.entry.success'));
    }
  };

  // Check if we have any accounts
  const hasAnyAccounts = filteredZkLoginAccounts.length > 0 || filteredMnemonicAccounts.length > 0 || filteredPrivateKeyAccounts.length > 0;

  const googleAccounts = useMemo(() => {
    return filteredZkLoginAccounts.filter((item) => item.provider === 'google');
  }, [filteredZkLoginAccounts]);

  const appleAccounts = useMemo(() => {
    return filteredZkLoginAccounts.filter((item) => item.provider === 'apple');
  }, [filteredZkLoginAccounts]);

  if (!hasAnyAccounts) {
    return (
      <EmptyAssetContainer>
        <EmptyAsset
          icon={<ImportMnemonicIcon />}
          title={t('pages.manage-account.switch-account.entry.noAccounts')}
          subTitle={t('pages.manage-account.switch-account.entry.noAccountsDescription')}
        />
      </EmptyAssetContainer>
    );
  }

  return (
    <AllAccountBody>
      {/* ZkLogin Accounts Section */}
      {googleAccounts.length > 0 && (
        <ZkLoginContainer>
          <TopContainer>
            <div className="h-[20px] text-[14px] text-white leading-[20px]">
              {t('pages.manage-account.switch-account.components.googleAccounts')}
            </div>
          </TopContainer>
          <BodyContainer>
            {googleAccounts.map((item, i) => {
              const isCurrentAccount = currentAccount?.id === item.id;
              return (
                <ZkLoginAccountButton
                  key={i}
                  isCurrentAccount={isCurrentAccount}
                  onClick={() => handleSwitchAccount(item.id, item.accountName)}
                >
                  <div className="flex size-[26px] rounded-full bg-white items-center justify-center">
                    <img
                      className="size-[18px]"
                      src={item.provider === 'apple' ? AppleLogo : GoogleLogo}
                      alt={(currentAccount as ZkLoginAccount).provider}
                    />
                  </div>
                  <div className="ml-[8px] flex-1 text-left text-white">
                    <div className="flex items-center">
                      <div className="h-[16px] leading-[16px] text-[14px]">{item.accountName}</div>
                    </div>
                  </div>
                  <div className="mr-[16px]">
                    {isCurrentAccount && <img src={CheckIcon} alt="" className="size-[18px]" />}
                  </div>
                </ZkLoginAccountButton>
              );
            })}
          </BodyContainer>
        </ZkLoginContainer>
      )}

      {appleAccounts.length > 0 && (
        <ZkLoginContainer>
          <TopContainer>
            <div className="h-[20px] text-[14px] text-white leading-[20px]">
              {t('pages.manage-account.switch-account.components.appleAccounts')}
            </div>
          </TopContainer>
          <BodyContainer>
            {appleAccounts.map((item, i) => {
              const isCurrentAccount = currentAccount?.id === item.id;
              return (
                <ZkLoginAccountButton
                  key={i}
                  isCurrentAccount={isCurrentAccount}
                  onClick={() => handleSwitchAccount(item.id, item.accountName)}
                >
                  <div className="flex size-[26px] rounded-full bg-white items-center justify-center">
                    <img
                      className="size-[18px]"
                      src={item.provider === 'apple' ? AppleLogo : GoogleLogo}
                      alt={(currentAccount as ZkLoginAccount).provider}
                    />
                  </div>
                  <div className="ml-[8px] flex-1 text-left text-white">
                    <div className="flex items-center">
                      <div className="h-[16px] leading-[16px] text-[14px]">{item.accountName}</div>
                    </div>
                  </div>
                  <div className="mr-[16px]">
                    {isCurrentAccount && <img src={CheckIcon} alt="" className="size-[18px]" />}
                  </div>
                </ZkLoginAccountButton>
              );
            })}
          </BodyContainer>
        </ZkLoginContainer>
      )}

      {/* Mnemonic Accounts Section */}
      {filteredMnemonicAccounts.map((item) => (
        <Container key={item.encryptedRestoreString}>
          <TopContainer>
            <div className="h-[20px] text-[14px] text-white leading-[20px]">{item.mnemonicName}</div>
          </TopContainer>
          <BodyContainer>
            {item.accounts.map((account, i) => {
              const isCurrentAccount = currentAccount?.id === account.id;
              return (
                <AccountButton
                  key={i}
                  isCurrentAccount={isCurrentAccount}
                  onClick={() => handleSwitchAccount(account.id, account.accountName)}
                >
                  <Avatar
                    size={26}
                    name={account.id}
                    variant="marble"
                  />
                  <div className="ml-[8px] flex-1 text-left text-white">
                    <div className="flex items-center">
                      <div className="h-[16px] leading-[16px] text-[14px]">{account.accountName}</div>
                    </div>
                  </div>
                  <div className="mr-[16px]">
                    {isCurrentAccount && <img src={CheckIcon} alt="" className="size-[18px]" />}
                  </div>
                </AccountButton>
              );
            })}
            {item.isNotBackedUp && (
              <OutlinedButtonContainer>
                <StyledOutlinedButton
                  variant="dark"
                  typoVarient="b4_M"
                  trailingIcon={
                    <RightArrowIconContainer>
                      <RightArrowIcon />
                    </RightArrowIconContainer>
                  }
                  onClick={() => setSupposedToBackupAccountId(item.accounts[0].id)}
                >
                  {t('pages.manage-account.switch-account.components.backUpNow')}
                </StyledOutlinedButton>
              </OutlinedButtonContainer>
            )}
            <AddAccountButton
              onClick={() => handleClickAddAccount(item.encryptedRestoreString, item.accounts.length)}
            >
              <span className="h-[24px] leading-[24px] text-[13px] text-[#477CFC]">
                {t('pages.manage-account.switch-account.components.addAccount')}
              </span>
            </AddAccountButton>
          </BodyContainer>
        </Container>
      ))}

      {/* Private Key Accounts Section */}
      {filteredPrivateKeyAccounts.length > 0 && (
        <PrivateKeyContainer>
          <TopContainer>
            <div className="h-[20px] text-[14px] text-white leading-[20px]">
              {t('pages.manage-account.switch-account.components.privateKeyAccounts')}
            </div>
          </TopContainer>
          <BodyContainer>
            {filteredPrivateKeyAccounts.map((item, i) => {
              const isCurrentAccount = currentAccount?.id === item.id;
              return (
                <AccountButton
                  key={i}
                  isCurrentAccount={isCurrentAccount}
                  onClick={() => handleSwitchAccount(item.id, item.accountName)}
                >
                  <Avatar
                    size={26}
                    name={item.id}
                    variant="marble"
                  />
                  <div className="ml-[8px] flex-1 text-left text-white">
                    <div className="flex items-center">
                      <div className="h-[16px] leading-[16px] text-[14px]">{item.accountName}</div>
                    </div>
                  </div>
                  <div className="mr-[16px]">
                    {isCurrentAccount && <img src={CheckIcon} alt="" className="size-[18px]" />}
                  </div>
                </AccountButton>
              );
            })}
          </BodyContainer>
        </PrivateKeyContainer>
      )}

      <VerifyPasswordBottomSheet
        open={!!supposedToBackupAccountId}
        onClose={() => setSupposedToBackupAccountId(undefined)}
        onSubmit={() => {
          navigate({
            to: ManageBackupStep1.to,
            params: {
              accountId: supposedToBackupAccountId || '',
            },
          });
        }}
      />
    </AllAccountBody>
  );
}
