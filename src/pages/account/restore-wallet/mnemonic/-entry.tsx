import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as bip39 from 'bip39';
import { v4 as uuidv4 } from 'uuid';
import { InputAdornment } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Button from '@/components/common/Button';
import MnemonicBitsPopover from '@/components/MnemonicViewer/components/MnemonicBitsPopover';
import SetAccountNameBottomSheet from '@/components/SetNameBottomSheet';
import { FilledTab, FilledTabs } from '@/components/common/FilledTab';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { getPassword } from '@/libs/account';
import { Route as RestoreWalletWithPrivateKey } from '@/pages/account/restore-wallet/privatekey';
import { Route as Dashboard } from '@/pages/index';
import type { AccountWithName } from '@/types/account';
import { aesEncrypt } from '@/utils/crypto';
import { sha512 } from '@/utils/crypto/password';
import { toastError } from '@/utils/toast';
import { addPreferAccountType } from '@/utils/zustand/preferAccountType';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import HdPathBottomSheet from './-components/HdPathBottomSheet';
import {
  Body,
  MnemonicContainer,
  MnemonicInputContainer,
  MnemonicInputWrapper,
  MnemonicWordIndexText,
  StyledInput,
} from './-styled';
import type { MnemonicBits } from '../../create-wallet/mnemonic/-entry';
import EyeOffIcon from '@/assets/images/icons/EyeOff20.svg';
import EyeOnIcon from '@/assets/images/icons/EyeOn20.svg';

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showPhrase, setShowPhrase] = useState(false);
  const { currentPassword } = useCurrentPassword();
  const { comparisonPasswordHash, updateExtensionStorageStore } = useExtensionStorageStore((state) => state);
  const { addAccountWithName, setCurrentAccount } = useCurrentAccount();

  const [isViewMnemonic] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [isOpenPopover, setIsOpenPopover] = useState(false);
  const [popoverAnchorEl] = useState<HTMLButtonElement | null>(null);

  const [isOpenSetAccountNameBottomSheet, setIsOpenSetAccountNameBottomSheet] = useState(false);

  const [isOpenHdPathBottomSheet, setIsOpenHdPathBottomSheet] = useState(false);
  const [currentHdPathIndex, setCurrentHdPathIndex] = useState('0');

  const [values, setValues] = useState<string[]>(Array(12).fill(''));

  const isFormComplete = values.every((value) => !!value);

  const mnemonicWordList = bip39.wordlists.english;

  const [inputTypes, setInputTypes] = useState(values.map(() => (showPhrase ? 'text' : 'password')));

  const handleFocusMnemonicInput = (index: number) => {
    setInputTypes((prevTypes) => {
      const newTypes = [...prevTypes];
      newTypes[index] = 'text';
      return newTypes;
    });
  };

  const handleBlurMnemonicInput = (index: number) => {
    setInputTypes((prevTypes) => {
      const newTypes = [...prevTypes];
      newTypes[index] = showPhrase ? 'text' : 'password';
      return newTypes;
    });
  };

  const updateMnemonicWords = (index: number, value: string) => {
    let newValues = [...values];
    const words = value.split(' ');

    if (words.length === 24) {
      setValues(Array(24).fill(''));
      newValues = Array(24).fill('');
    }

    if (words.length === 18) {
      setValues(Array(18).fill(''));
      newValues = Array(18).fill('');
    }

    if (words.length > 1) {
      words.forEach((word, i) => {
        if (i < newValues.length) {
          newValues[i] = word;
        }
      });
    } else {
      newValues[index] = value;
    }

    setValues(newValues);
  };

  const set24Words = () => {
    const newValues = [...values.slice(0, 12), ...Array(12).fill('')];

    setValues(newValues);
  };

  const set18Words = () => {
    const newValues = [...values.slice(0, 12), ...Array(6).fill('')];

    setValues(newValues);
  };

  const set12Words = () => {
    setValues(values.slice(0, 12));
  };

  const handleMnemonicBitChange = (bits: MnemonicBits) => {
    if (bits === 128) {
      set12Words();
    } else if (bits === 192) {
      set18Words();
    } else {
      set24Words();
    }
  };

  useEffect(() => {
    setInputTypes(values.map(() => (showPhrase ? 'text' : 'password')));
  }, [values, showPhrase]);

  const setUpAccount = async (newAccountName: string) => {
    try {
      setIsLoadingBalance(true);

      const joinedMnemonicPhrase = values.join(' ');
      const encryptedRestoreString = sha512(joinedMnemonicPhrase);

      // Check if mnemonic already exists by comparing encryptedRestoreString
      const { userAccounts } = useExtensionStorageStore.getState();
      const existingMnemonic = userAccounts.find(
        (account) => account.type === 'MNEMONIC' && account.encryptedRestoreString === encryptedRestoreString
      );

      if (existingMnemonic) {
        toastError(t('pages.account.restore-wallet.mnemonic.index.mnemonicAlreadyExists'));
        return;
      }

      const accountId = uuidv4();

      const decryptedPassword = await getPassword();

      const encryptedMnemonic = aesEncrypt(joinedMnemonicPhrase, decryptedPassword);

      const newAccount: AccountWithName = {
        id: accountId,
        type: 'MNEMONIC',
        name: newAccountName,
        index: currentHdPathIndex,
        encryptedMnemonic: encryptedMnemonic,
        encryptedRestoreString,
      };

      if (!comparisonPasswordHash) {
        const comparisonPasswordHash = sha512(currentPassword!);
        await updateExtensionStorageStore('comparisonPasswordHash', comparisonPasswordHash);
      }


      await addAccountWithName(newAccount);

      await addPreferAccountType(newAccount.id);
      await setCurrentAccount(newAccount.id);

      navigate({
        to: Dashboard.to,
      });
    } catch {
      toastError(t('pages.account.restore-wallet.mnemonic.index.addressAndBalanceFetchingError'));
    } finally {
      setIsLoadingBalance(false);
    }
  };

  return (
    <>
      <BaseBody>
        <Body>
          <FilledTabs value={0} variant="fullWidth">
            <FilledTab key="mnemonic" label={t('pages.account.restore-wallet.mnemonic.entry.mnemonicTab')} />
            <FilledTab
              key="privateKey"
              label={t('pages.account.restore-wallet.mnemonic.entry.privateKeyTab')}
              onClick={() =>
                navigate({
                  to: RestoreWalletWithPrivateKey.to,
                  replace: true,
                })
              }
            />
          </FilledTabs>

          <MnemonicContainer>
            <div className="mt-[16px] w-[312px] text-[36px] leading-[40px] font-bold text-white">
              {t('pages.account.restore-wallet.mnemonic.index.title')}
            </div>
            <div className="mt-[12px] flex justify-between">
              <div className="text-[16px] leading-[19px] font-normal text-white opacity-60">
                {t('pages.account.restore-wallet.mnemonic.entry.description')}
              </div>
              <div onClick={() => setShowPhrase(!showPhrase)}>
                {showPhrase ? <EyeOnIcon  /> : <EyeOffIcon />}
              </div>
            </div>

            <MnemonicInputWrapper>
              <MnemonicInputContainer>
                {values.map((value, index) => (
                  <StyledInput
                    key={index}
                    value={value}
                    type={showPhrase ? 'text' : inputTypes[index]}
                    startAdornment={
                      <InputAdornment position="start">
                        <MnemonicWordIndexText variant="h5n_M">{index + 1}</MnemonicWordIndexText>
                      </InputAdornment>
                    }
                    hideViewIcon
                    error={!!value && !mnemonicWordList.includes(value)}
                    onFocus={() => handleFocusMnemonicInput(index)}
                    onBlur={() => handleBlurMnemonicInput(index)}
                    onChange={(e) => {
                      if (e.target.value.endsWith(' ')) {
                        return;
                      }

                      updateMnemonicWords(index, e.target.value);
                    }}
                  />
                ))}
              </MnemonicInputContainer>
            </MnemonicInputWrapper>
          </MnemonicContainer>
        </Body>
      </BaseBody>
      <BaseFooter>
        <>
          <Button
            disabled={!isFormComplete}
            isProgress={isLoadingBalance}
            onClick={() => {
              const joinedMnemonicPhrase = values.join(' ');

              const isValidMnemonicPhrase = bip39.validateMnemonic(joinedMnemonicPhrase);

              if (!isValidMnemonicPhrase) {
                toastError(t('pages.account.restore-wallet.mnemonic.index.invalidMnemonicPhrase'));
                return;
              }

              setIsOpenSetAccountNameBottomSheet(true);
            }}
          >
            {t('pages.account.restore-wallet.mnemonic.index.next')}
          </Button>
        </>
      </BaseFooter>
      <MnemonicBitsPopover
        open={isOpenPopover}
        onClose={() => {
          setIsOpenPopover(false);
        }}
        onClickMnemonicBits={(bits) => {
          handleMnemonicBitChange(bits);
          setIsOpenPopover(false);
        }}
        anchorEl={popoverAnchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      />
      <HdPathBottomSheet
        currentHdPathIndex={currentHdPathIndex}
        open={isOpenHdPathBottomSheet}
        onClose={() => setIsOpenHdPathBottomSheet(false)}
        onChangeHdPathIndex={(val) => {
          setCurrentHdPathIndex(val);
        }}
      />
      <SetAccountNameBottomSheet
        open={isOpenSetAccountNameBottomSheet}
        onClose={() => setIsOpenSetAccountNameBottomSheet(false)}
        setName={async (accountName) => {
          await setUpAccount(accountName);
        }}
      />
    </>
  );
}
