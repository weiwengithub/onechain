import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import sleep from 'sleep-promise';

import EmptyAsset from '@/components/EmptyAsset';
import VerifyPasswordBottomSheet from '@/components/VerifyPasswordBottomSheet';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { Route as Home } from '@/pages/index';
import { Route as ManageBackupStep1 } from '@/pages/manage-account/backup-wallet/step1/$accountId';
import { Route as CreateAccountWithExistMnemonic } from '@/pages/manage-account/create-account/$mnemonicId';
import { toastError, toastSuccess } from '@/utils/toast';
import { getShortAddress } from '@/utils/string';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import Avatar from "boring-avatars";
import ArrowRightIcon from '@/assets/img/icon/arrow_right_16.png';

import {
  AccountButton,
  AddAccountButton,
  BodyContainer,
  Container,
  EmptyAssetContainer,
  OutlinedButtonContainer,
  RightArrowIconContainer,
  StyledOutlinedButton,
  TopContainer,
} from './styled';

import ImportMnemonicIcon from '@/assets/images/icons/ImportMnemonic70.svg';
import RightArrowIcon from '@/assets/images/icons/RightArrow14.svg';
import CheckIcon from 'assets/img/icon/checked.png';
import { v4 as uuidv4 } from 'uuid';
import type { AccountWithName } from '@/types/account.ts';
import { addPreferAccountType } from '@/utils/zustand/preferAccountType.ts';

type MnemonicAccountProps = {
  search?: string;
};

export default function MnemonicAccount({ search }: MnemonicAccountProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [supposedToBackupAccountId, setSupposedToBackupAccountId] = useState<string | undefined>();

  const { currentAccount, setCurrentAccount, addAccountWithName } = useCurrentAccount();

  const { userAccounts, accountNamesById, mnemonicNamesByHashedMnemonic, notBackedUpAccountIds } = useExtensionStorageStore((state) => state);

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

  const filteredMnemonicAccounts = useMemo(() => {
    if (!mnemonicAccounts) return [];

    const lowerSearch = search?.toLowerCase() ?? '';

    if (!lowerSearch) return mnemonicAccounts;

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

  if (filteredMnemonicAccounts.length === 0) {
    return (
      <EmptyAssetContainer>
        <EmptyAsset
          icon={<ImportMnemonicIcon />}
          title={t('pages.manage-account.switch-account.entry.importMnemonic')}
          subTitle={t('pages.manage-account.switch-account.entry.importMnemonicDescription')}
        />
      </EmptyAssetContainer>
    );
  }

  const handleClickAddAccount = async (mnemonicId: string, index = 0) => {
    const mnemonicAccount = userAccounts.find((account) => account.type === 'MNEMONIC' && account.encryptedRestoreString === mnemonicId);
    if (!mnemonicAccount) {
      toastError(t('pages.manage-account.create-account.entry.failToFindMnemonic'));
    }
    if (mnemonicAccount?.type === 'MNEMONIC') {
      const accountId = uuidv4();
      const newAccount: AccountWithName = {
        id: accountId,
        type: 'MNEMONIC',
        name: `Account ${++index}`,
        index: index.toString(),
        encryptedMnemonic: mnemonicAccount.encryptedMnemonic,
        encryptedRestoreString: mnemonicAccount.encryptedRestoreString,
      };

      await addAccountWithName(newAccount);

      await addPreferAccountType(newAccount.id);

      await setCurrentAccount(newAccount.id);

      navigate({
        to: Home.to,
      });
    }
  };

  return (
    <>
      {filteredMnemonicAccounts.map((item) => {
        return (
          <Container key={item.encryptedRestoreString}>
            <TopContainer>
              <div className="h-[20px] text-[14px] text-white leading-[20px]">{item.mnemonicName}</div>
            </TopContainer>
            <BodyContainer>
              {item.accounts.map((item, i) => {
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
                    <Avatar
                      size={26}
                      name={item.id}
                      variant={"marble"}
                    />
                    <div className="ml-[8px] flex-1 text-left text-white">
                      <div className="flex items-center">
                        <div className="h-[16px] leading-[16px] text-[14px]">{item.accountName}</div>
                      </div>
                      {/*<div className="mt-[2px] h-[16px] leading-[16px] text-[14px] opacity-40">{getShortAddress(item.id)}</div>*/}
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
                    onClick={() => {
                      setSupposedToBackupAccountId(item.accounts[0].id);
                    }}
                  >
                    {t('pages.manage-account.switch-account.components.backUpNow')}
                  </StyledOutlinedButton>
                </OutlinedButtonContainer>
              )}
              <AddAccountButton
                onClick={() => {
                  handleClickAddAccount(item.encryptedRestoreString, item.accounts.length);
                }}
              >
                <span className="h-[24px] leading-[24px] text-[13px] text-[#477CFC]">Add account</span>
              </AddAccountButton>
            </BodyContainer>
          </Container>
        );
      })}

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
    </>
  );
}
