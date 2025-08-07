import { useForm } from 'react-hook-form';
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
import type { PasswordForm } from './-useSchema';
import { useSchema } from './-useSchema';

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { setCurrentPassword } = useCurrentPassword();

  const { passwordForm } = useSchema();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<PasswordForm>({
    resolver: joiResolver(passwordForm),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const { password, repeatPassword } = watch();
  const isButtonEnabled = password && repeatPassword;

  const submit = (data: PasswordForm) => {
    setCurrentPassword(data.password);

    navigate({
      to: AddWallet.to,
    });
    reset();
  };

  return (
    <>
      <FormContainer onSubmit={handleSubmit(submit)}>
        <BaseBody>
          <Body>
            <div className="w-[216px] text-[36px] leading-[40px] font-bold text-white">{t('pages.account.set-password.index.protectWallet')}</div>
            <div className="mt-[12px] h-[19px] text-[16px] leading-[19px] text-white opacity-60">{t('pages.account.set-password.index.passwordTip')}</div>
            <PasswordInputContainer>
              <StandardInput
                  placeholder={t('pages.account.set-password.index.password')}
                  type="password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      ...register('password'),
                    },
                  }}
              />
              <StandardInput
                  placeholder={t('pages.account.set-password.index.confirmPassword')}
                  type="password"
                  error={!!errors.repeatPassword}
                  helperText={errors.repeatPassword?.message}
                  slotProps={{
                    input: {
                      ...register('repeatPassword'),
                    },
                  }}
              />
            </PasswordInputContainer>
          </Body>
        </BaseBody>
        <BaseFooter>
          <>
            <Button type="submit" disabled={!isButtonEnabled}>
              {t('pages.account.set-password.index.nextStep')}
            </Button>
          </>
        </BaseFooter>
      </FormContainer>
    </>
  );
}
