import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { joiResolver } from '@hookform/resolvers/joi';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Button from '@/components/common/Button';
import StandardInput from '@/components/common/StandardInput';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { Route as AddWallet } from '@/pages/account/add-wallet';

import { Body, FormContainer, PasswordInputContainer } from './-styled';
import { getPasswordStrength } from '@/utils/zxcvbn';
import type { Score as PasswordScore } from '@zxcvbn-ts/core';

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { setCurrentPassword } = useCurrentPassword();

  const [password, setPassword] = useState<string>('');
  const [repeatPassword, setRepeatPassword] = useState<string>('');
  const [passwordMessage, setPasswordMessage] = useState<string>('');
  const [repeatPasswordMessage, setRepeatPasswordMessage] = useState<string>('');
  const [passwordScore, setPasswordScore] = useState<PasswordScore | null>(
    null,
  );
  const isButtonEnabled = password && repeatPassword;

  useEffect(() => {
    if (password) {
      void getPasswordStrength(password).then((score) => {
        setPasswordScore(score);
      });
    } else {
      setPasswordScore(null);
    }
  }, [password]);

  const handleSubmit = async () => {
    let isValid = true;
    if (password.length < 8) {
      setPasswordMessage(t('schema.common.string.min1', { limit: 8 }));
      isValid = false;
    }
    if (repeatPassword !== password) {
      setRepeatPasswordMessage(t('schema.passwordForm.repeatPassword.any.only'));
      isValid = false;
    }
    if (isValid) {
      await setCurrentPassword(password);
      navigate({
        to: AddWallet.to,
      });
    }
  };

  return (
    <>
      <FormContainer>
        <BaseBody>
          <Body>
            <div
              className="w-[216px] text-[36px] leading-[40px] font-bold text-white"
            >{t('pages.account.set-password.index.protectWallet')}</div>
            <div
              className="mt-[12px] h-[19px] text-[16px] leading-[19px] text-white opacity-60"
            >{t('pages.account.set-password.index.passwordTip')}</div>
            <PasswordInputContainer>
              <StandardInput
                placeholder={t('pages.account.set-password.index.password')}
                type="password"
                error={!!passwordMessage}
                helperText={passwordMessage}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setPasswordMessage('');
                }}
              />
              {passwordScore !== null && (
                <>
                  <div className="h-[8px] rounded-[4px] bg-[#1E2025] overflow-hidden">
                    <div
                      className={`h-full ${['w-1/5 bg-[#ef4444]', 'w-2/5 bg-[#f59e0b]', 'w-3/5 bg-[#eab308]', 'w-4/5 bg-[#22c55e]', 'w-full bg-[#16a34a]'][passwordScore]}`}
                    />
                  </div>
                  <div
                    className={`mt-[-8px] text-[14px] ${['text-[#ef4444]', 'text-[#f59e0b]', 'text-[#eab308]', 'text-[#22c55e]', 'text-[#16a34a]'][passwordScore]}`}
                  >
                    {[
                      t('pages.account.set-password.index.veryWeak'),
                      t('pages.account.set-password.index.weak'),
                      t('pages.account.set-password.index.moderate'),
                      t('pages.account.set-password.index.strong'),
                      t('pages.account.set-password.index.veryStrong'),
                    ][passwordScore]}
                  </div>
                </>
              )}
              <StandardInput
                placeholder={t('pages.account.set-password.index.confirmPassword')}
                type="password"
                error={!!repeatPasswordMessage}
                helperText={repeatPasswordMessage}
                value={repeatPassword}
                onChange={e => {
                  setRepeatPassword(e.target.value);
                  setRepeatPasswordMessage('');
                }}
              />
            </PasswordInputContainer>
          </Body>
        </BaseBody>
        <BaseFooter>
          <>
            <Button disabled={!isButtonEnabled} onClick={handleSubmit}>
              {t('pages.account.set-password.index.nextStep')}
            </Button>
          </>
        </BaseFooter>
      </FormContainer>
    </>
  );
}
