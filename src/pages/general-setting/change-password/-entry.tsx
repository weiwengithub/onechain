import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from '@mui/material';
import { useRouter } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import Button from '@/components/common/Button';
import StandardInput from '@/components/common/StandardInput';
import InformationPanel from '@/components/InformationPanel';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { aesDecrypt, aesEncrypt } from '@/utils/crypto';
import { sha512 } from '@/utils/crypto/password';
import { toastSuccess } from '@/utils/toast';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { getPasswordStrength } from "@/utils/zxcvbn";
import type { Score as PasswordScore } from "@zxcvbn-ts/core";

import {
  Body,
  CautionContainer,
  DescriptionContainer,
  DescriptionSubTitle,
  DescriptionTitle,
  Divider,
  FormContainer,
  NewPasswordInputContainer,
  PrevioudPasswordInputContainer,
} from './-styled';

export default function Entry() {
  const { t } = useTranslation();
  const { history } = useRouter();

  const { userAccounts, comparisonPasswordHash, updateExtensionStorageStore } = useExtensionStorageStore((state) => state);

  const { setCurrentPassword } = useCurrentPassword();

  const [previousPassword, setPreviousPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [repeatNewPassword, setRepeatNewPassword] = useState<string>('');

  const [previousPasswordMessage, setPreviousPasswordMessage] = useState<string>('');
  const [newPasswordMessage, setNewPasswordMessage] = useState<string>('');
  const [repeatNewPasswordMessage, setRepeatNewPasswordMessage] = useState<string>('');

  const [passwordScore, setPasswordScore] = useState<PasswordScore | null>(
    null,
  );
  const isButtonEnabled = previousPassword && newPassword && repeatNewPassword;

  useEffect(() => {
    if (newPassword) {
      void getPasswordStrength(newPassword).then((score) => {
        setPasswordScore(score);
      });
    } else {
      setPasswordScore(null);
    }
  }, [newPassword]);

  const handleSubmit = async () => {
    let isValid = true;
    if (sha512(previousPassword) !== comparisonPasswordHash) {
      setPreviousPasswordMessage(t('schema.changePasswordForm.password.any.only'))
      isValid = false;
    }
    if (newPassword.length < 8) {
      setNewPasswordMessage(t('schema.common.string.min1', { limit: 8 }))
      isValid = false;
    }
    if (repeatNewPassword !== newPassword) {
      setRepeatNewPasswordMessage(t('schema.changePasswordForm.repeatPassword.any.only'))
      isValid = false;
    }
    if (isValid) {
      const newAccounts = userAccounts.map((account) => {
        if (account.type === 'MNEMONIC') {
          const mnemonic = aesDecrypt(account.encryptedMnemonic, previousPassword);

          return { ...account, encryptedMnemonic: aesEncrypt(mnemonic, newPassword), encryptedPassword: aesEncrypt(newPassword, mnemonic) };
        }

        if (account.type === 'PRIVATE_KEY') {
          const privateKey = aesDecrypt(account.encryptedPrivateKey, previousPassword);

          return { ...account, encryptedPrivateKey: aesEncrypt(privateKey, newPassword), encryptedPassword: aesEncrypt(newPassword, privateKey) };
        }

        return account;
      });

      await updateExtensionStorageStore('userAccounts', newAccounts);

      await updateExtensionStorageStore('comparisonPasswordHash', sha512(newPassword));

      await setCurrentPassword(newPassword);

      toastSuccess(t('pages.general-setting.change-password.entry.success'));

      history.go(-1);
    }
  };

  return (
    <FormContainer>
      <BaseBody>
        <Body>
          <DescriptionContainer>
            <DescriptionTitle variant="h2_B">{t('pages.general-setting.change-password.entry.title')}</DescriptionTitle>
            <DescriptionSubTitle variant="b3_R_Multiline">{t('pages.general-setting.change-password.entry.subTitle')}</DescriptionSubTitle>
          </DescriptionContainer>

          <PrevioudPasswordInputContainer>
            <StandardInput
              placeholder={t('pages.general-setting.change-password.entry.currentPassword')}
              type="password"
              error={!!previousPasswordMessage}
              helperText={previousPasswordMessage}
              value={previousPassword}
              onChange={e => {
                setPreviousPassword(e.target.value)
                setPreviousPasswordMessage('')
              }}
            />
          </PrevioudPasswordInputContainer>
          <EdgeAligner>
            <Divider />
          </EdgeAligner>
          <NewPasswordInputContainer>
            <StandardInput
              placeholder={t('pages.general-setting.change-password.entry.newPassword')}
              type="password"
              error={!!newPasswordMessage}
              helperText={newPasswordMessage}
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value)
                setNewPasswordMessage('')
              }}
            />
            {passwordScore !== null && (
              <>
                <div className="h-[8px] rounded-[4px] bg-[#1E2025] overflow-hidden">
                  <div className={`h-full ${['w-1/5 bg-[#ef4444]', 'w-2/5 bg-[#f59e0b]', 'w-3/5 bg-[#eab308]', 'w-4/5 bg-[#22c55e]', 'w-full bg-[#16a34a]'][passwordScore]}`} />
                </div>
                <div className={`mt-[-8px] text-[14px] ${['text-[#ef4444]', 'text-[#f59e0b]', 'text-[#eab308]', 'text-[#22c55e]', 'text-[#16a34a]'][passwordScore]}`}>
                  {[
                    t('pages.account.set-password.index.veryWeak'),
                    t('pages.account.set-password.index.weak'),
                    t('pages.account.set-password.index.moderate'),
                    t('pages.account.set-password.index.strong'),
                    t('pages.account.set-password.index.veryStrong')
                  ][passwordScore]}
                </div>
              </>
            )}
            <StandardInput
              placeholder={t('pages.general-setting.change-password.entry.confirmNewPassword')}
              type="password"
              error={!!repeatNewPasswordMessage}
              helperText={repeatNewPasswordMessage}
              value={repeatNewPassword}
              onChange={e => {
                setRepeatNewPassword(e.target.value)
                setRepeatNewPasswordMessage('')
              }}
            />
          </NewPasswordInputContainer>
        </Body>
      </BaseBody>
      <BaseFooter>
        <>
          {/*<CautionContainer>*/}
          {/*  <InformationPanel*/}
          {/*    varitant="caution"*/}
          {/*    title={<Typography variant="b3_M">{t('pages.general-setting.change-password.entry.caution')}</Typography>}*/}
          {/*    body={<Typography variant="b4_R_Multiline">{t('pages.general-setting.change-password.entry.cautionDescription')}</Typography>}*/}
          {/*  />*/}
          {/*</CautionContainer>*/}
          <Button disabled={!isButtonEnabled} onClick={handleSubmit}>
            {t('pages.general-setting.change-password.entry.submit')}
          </Button>
        </>
      </BaseFooter>
    </FormContainer>
  );
}
