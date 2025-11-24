import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { joiResolver } from '@hookform/resolvers/joi';
import { useLocation, useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Button from '@/components/common/Button';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { Route as ResetWallet } from '@/pages/manage-account/reset-wallet';
import { Route as SwitchWallet } from '@/pages/manage-account/switch-account';
import { sha512 } from '@/utils/crypto/password';
import { removeTrailingSlash } from '@/utils/string';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import { useZklogin, ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY, MAX_EPOCH_LOCAL_STORAGE_KEY } from '@/hooks/useZklogin';
import { toastError, toastSuccess } from '@/utils/toast';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { aesEncrypt, aesDecrypt } from '@/utils/crypto';
import type { ZkLoginAccount } from '@/types/account';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import { FormContainer, StyledInput, StyledInputContainer } from './styled';
import type { PasswordForm } from './useSchema';
import { useSchema } from './useSchema';
import UnlockIcon from '@/assets/img/icon/unlock.png';

type LockProps = {
  children: JSX.Element;
};

export default function Lock({ children }: LockProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { currentPassword, setCurrentPassword } = useCurrentPassword();

  const { comparisonPasswordHash, userAccounts, currentAccountId } = useExtensionStorageStore((state) => state);
  const {
    validateAndUpdateEpoch,
    clearZkLoginCache,
    getCachedZkLoginData,
    getCachedAppleZkLoginData,
    ephemeralKeyPair,
    maxEpoch,
  } = useZklogin();
  const { setCurrentAccount, addAccount } = useCurrentAccount();

  const [inputPassword, setInputPassword] = useState('');
  const [isReAuthenticating, setIsReAuthenticating] = useState(false);

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
    // Check if current account is zklogin and validate epoch BEFORE setting password
    const currentAccount = userAccounts.find(acc => acc.id === currentAccountId);

    if (currentAccount?.type === 'ZKLOGIN') {
      console.log('[Lock] Validating zkLogin epoch on unlock...');
      const epochResult = await validateAndUpdateEpoch();

      if (!epochResult.isValid) {
        console.warn('[Lock] Epoch expired, starting re-authentication...');
        toastError(t('components.Lock.index.zkSessionExpired'));
        clearZkLoginCache();

        try {
          setIsReAuthenticating(true);
          const zkLoginAccount = currentAccount as ZkLoginAccount;
          const provider = zkLoginAccount.provider;
          console.log(`[Lock] Re-authenticating with ${provider} provider...`);

          let authData;
          if (provider === 'google') {
            authData = await getCachedZkLoginData(inputPassword);
          } else if (provider === 'apple') {
            authData = await getCachedAppleZkLoginData(inputPassword);
          } else {
            throw new Error(`Unknown provider: ${provider}`);
          }

          // Check if authData is complete
          if (authData.idToken && authData.userSalt && authData.zkProof && authData.address) {
            console.log('[Lock] Re-authentication successful, reading latest data from localStorage...');

            // Read ephemeralKeyPair and maxEpoch from localStorage (they were just updated by getCachedZkLoginData)
            const encryptedEphemeralKey = localStorage.getItem(ENCRYPTED_EPHEMERAL_KEY_STORAGE_KEY);
            const cachedMaxEpoch = localStorage.getItem(MAX_EPOCH_LOCAL_STORAGE_KEY);

            if (!encryptedEphemeralKey || !cachedMaxEpoch) {
              throw new Error('Failed to read ephemeralKeyPair or maxEpoch from localStorage');
            }

            // Decrypt ephemeralKeyPair to get private key for encryption
            const decryptedPrivateKey = aesDecrypt(encryptedEphemeralKey, inputPassword);
            const latestEphemeralKeyPair = Ed25519Keypair.fromSecretKey(decryptedPrivateKey);
            const ephemeralPrivateKey = latestEphemeralKeyPair.getSecretKey();
            const latestMaxEpoch = Number(cachedMaxEpoch);

            console.log('[Lock] Updating account with latest ephemeralKeyPair and maxEpoch:', latestMaxEpoch);

            const encryptedIdToken = aesEncrypt(authData.idToken, inputPassword);
            const encryptedUserSalt = aesEncrypt(authData.userSalt, inputPassword);
            const reEncryptedEphemeralKey = aesEncrypt(ephemeralPrivateKey, inputPassword);
            const encryptedZkProof = aesEncrypt(JSON.stringify(authData.zkProof), inputPassword);

            const updatedAccount: ZkLoginAccount = {
              ...zkLoginAccount,
              encryptedIdToken,
              encryptedUserSalt,
              encryptedEphemeralKey: reEncryptedEphemeralKey,
              encryptedZkProof,
              maxEpoch: latestMaxEpoch,
              address: authData.address,
            };

            await addAccount(updatedAccount);

            console.log('[Lock] Account updated successfully with new authentication data');
            toastSuccess(t('components.Lock.index.reAuthSuccess'));

            // IMPORTANT: Do not set password, keep wallet locked
            setIsReAuthenticating(false);
            reset();
            return; // Exit without unlocking
          } else {
            throw new Error('Re-authentication failed: incomplete authentication data');
          }
        } catch (error) {
          console.error('[Lock] Re-authentication failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toastError(
            t('components.Lock.index.reAuthFailed', {
              message: errorMessage,
            }),
          );
          setIsReAuthenticating(false);
          reset();
          return;
        }
      }

      console.log('[Lock] Epoch validation passed');
    }

    // Only set password if epoch is valid (or account is not zklogin)
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
            alt={t('components.Lock.index.title')}
            className="mx-auto mt-[36px] h-[110px]"
          />
          <div
            className="mt-[24px] mb-[24px] h-[40px] text-center text-[26px] leading-[40px] text-white font-bold"
          >
            {t('components.Lock.index.title')}
          </div>
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
          <div className="mt-[16px] h-[24px] leading-[24px] text-center opacity-60">
            <span
              className="text-white text-[14px] cursor-pointer"
              onClick={() => {
                navigate({
                  to: ResetWallet.to,
                });
              }}
            >
              {t('components.Lock.index.forgotPassword')}
            </span>
          </div>
        </BaseBody>
        <BaseFooter>
          <Button
            type="submit"
            disabled={!isButtonEnabled || isReAuthenticating}
            isProgress={isReAuthenticating}
            loadingText={isReAuthenticating ? t('components.Lock.index.loading') : undefined}
          >
            {t('components.Lock.index.unlock')}
          </Button>
        </BaseFooter>
      </FormContainer>
    );
  }

  return children;
}
