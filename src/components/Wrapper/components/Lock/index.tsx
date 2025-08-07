import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { joiResolver } from '@hookform/resolvers/joi';
import { useLocation } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Button from '@/components/common/Button';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { Route as ResetWallet } from '@/pages/manage-account/reset-wallet';
import { sha512 } from '@/utils/crypto/password';
import { removeTrailingSlash } from '@/utils/string';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import { FormContainer, StyledInput, StyledInputContainer } from './styled';
import type { PasswordForm } from './useSchema';
import { useSchema } from './useSchema';
import UnlockIcon from '@/assets/img/icon/unlock.png';

type LockProps = {
  children: JSX.Element;
};

export default function Lock({ children }: LockProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const { currentPassword, setCurrentPassword } = useCurrentPassword();

  const { comparisonPasswordHash } = useExtensionStorageStore((state) => state);

  const [inputPassword, setInputPassword] = useState('');

  const { passwordForm } = useSchema({ comparisonPasswordHash: comparisonPasswordHash! });

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

  const { ref, ...remainder } = register('password', {
    setValueAs: (v: string) => {
      setInputPassword(v);
      return v ? sha512(v) : '';
    },
  });

  const { password } = watch();
  const isButtonEnabled = !!password;

  const submit = async () => {
    await setCurrentPassword(inputPassword);
    reset();
  };

  const isDisableLock = useMemo(() => {
    if (location.pathname === removeTrailingSlash(ResetWallet.to)) {
      return true;
    }
  }, [location.pathname]);

  if (isDisableLock) {
    return children;
  }

  if (!currentPassword && comparisonPasswordHash) {
    return (
      <FormContainer onSubmit={handleSubmit(submit)}>
        <BaseBody>
          <img
            src={UnlockIcon}
            alt="unlock"
            className="mx-auto mt-[36px] h-[110px]"
          />
          <div className="mt-[24px] mb-[24px] h-[40px] text-center text-[26px] leading-[40px] text-white font-bold">Unlock wallet</div>
          <StyledInputContainer>
            <StyledInput
              placeholder={t('components.Lock.index.enterPassword')}
              type="password"
              error={!!errors.password}
              helperText={errors.password?.message}
              inputRef={ref}
              {...remainder}
            />
          </StyledInputContainer>
        </BaseBody>
        <BaseFooter>
          <Button type="submit" disabled={!isButtonEnabled}>
            {t('components.Lock.index.unlock')}
          </Button>
        </BaseFooter>
      </FormContainer>
    );
  }

  return children;
}
