import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// import { Typography } from '@mui/material';
import { CircularProgress } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { v4 as uuidv4 } from 'uuid';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
// import EdgeAligner from '@/components/BaseLayout/components/EdgeAligner';
import TextButton from '@/components/common/TextButton';
import SetAccountNameBottomSheet from '@/components/SetNameBottomSheet';
// import InformationPanel from '@/components/InformationPanel';
import { useCurrentAccount } from '@/hooks/useCurrentAccount';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { Route as CreateMnemonic } from '@/pages/account/create-wallet/mnemonic';
import { Route as RestoreWalletWithMnemonic } from '@/pages/account/restore-wallet/mnemonic';
import { Route as Dashboard } from '@/pages/index';
import { Route as Init } from '@/pages/account/initial';
import type { AccountWithName, ZkLoginAccount, ZkloginProvider } from '@/types/account';
import { aesEncrypt } from '@/utils/crypto';
import { ZKLOGIN_SUPPORTED_CHAIN_ID, ZKLOGIN_SUPPORTED_CHAIN_TYPE, ZKLOGIN_ACCOUNT_TYPE } from '@/constants/zklogin';
import { sha512 } from '@/utils/crypto/password';
import { toastError, toastSuccess } from '@/utils/toast';
import { addPreferAccountType } from '@/utils/zustand/preferAccountType';
import { getExtensionLocalStorage } from '@/utils/storage';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
// import { Route as RestoreWalletWithPrivateKey } from '@/pages/account/restore-wallet/privatekey';

// import OptionButton from './-components/OptionButton';
import { Body, DescriptionText, FooterContainer } from './-styled';

// import CreateWalletIcon from '@/assets/images/icons/CreateWallet28.svg';
// import MnemonicWalletIcon from '@/assets/images/icons/MnemonicWallet28.svg';
// import PrivateKeyWalletIcon from '@/assets/images/icons/PrivateKeyWallet28.svg';
import BgLeft from '@/assets/img/HomeBackgroundLeft.png';
import BgRight from '@/assets/img/HomeBackgroundRight.png';
import HomeIcon from '@/assets/img/home_icon.png';
// import { Route as SetPassword } from '@/pages/account/set-password';
import AddPrimaryIcon from '@/assets/img/icon/add_primary.png';
import AddGreyIcon from '@/assets/img/icon/add_grey.png';
import ImportIcon from '@/assets/img/icon/import.png';
// import CheckboxIcon from '@/assets/img/icon/checkbox.png';
// import CheckboxCheckedIcon from '@/assets/img/icon/checkbox_checked.png';
import GoogleLogo from '@/assets/images/logos/g.webp';
import AppleLogo from '@/assets/images/logos/apple.png';
import { useZklogin } from '@/hooks/useZklogin.ts';

type Props = {
  imageSrc: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
};

const LoginButton = (props: Props) => {
  const { loadingText, imageSrc, title, onClick, disabled = false, loading = false } = props;

  return <div
    className={`flex flex-row h-10px items-center justify-center rounded-full bg-[#1E2025] my-2 p-3 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    }`}
    onClick={disabled ? undefined : onClick}
  >
    <div className="flex size-[36px] rounded-[40px] bg-white items-center justify-center">
      <img
        className={'size-[18px]'}
        src={imageSrc}
        alt={imageSrc}
      />
    </div>
    <div
      className="flex flex-1 text-[20px] leading-[23px] text-white items-center justify-center"
    >
      {loading ? <>
        <CircularProgress size={18} sx={{ color: 'white' }} />
        {loadingText && <span className="text-[20px] pl-2">{loadingText}</span>}
      </> : title}
    </div>
  </div>;
};

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    getCachedZkLoginData,
    getCachedAppleZkLoginData,
    loading: zkLoginLoading,
    ephemeralKeyPair,
    maxEpoch,
    decodedJwt,
    hasCachedData,
    clearZkLoginCache,
  } = useZklogin();

  const {
    userAccounts,
    comparisonPasswordHash,
    updateExtensionStorageStore,
  } = useExtensionStorageStore((state) => state);
  const { currentPassword } = useCurrentPassword();
  const { addAccountWithName, setCurrentAccount } = useCurrentAccount();

  const isInitialSetup = userAccounts.length === 0;

  // 清理定时器
  useEffect(() => {
    return () => {
      if (googleTimerRef.current) {
        clearInterval(googleTimerRef.current);
      }
      if (appleTimerRef.current) {
        clearInterval(appleTimerRef.current);
      }
    };
  }, []);

  const [isOpenSetAccountNameBottomSheet, setIsOpenSetAccountNameBottomSheet] = useState(false);
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleCountdown, setGoogleCountdown] = useState(5);
  const [appleCountdown, setAppleCountdown] = useState(5);
  const googleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const appleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [zkLoginData, setZkLoginData] = useState<{
    idToken?: string;
    userSalt?: string;
    zkProof?: any;
    address?: string;
    provider?: ZkloginProvider;
  }>({});

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setGoogleCountdown(5);

    // 启动倒计时
    googleTimerRef.current = setInterval(() => {
      setGoogleCountdown((prev) => {
        if (prev <= 1) {
          if (googleTimerRef.current) {
            clearInterval(googleTimerRef.current);
            googleTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      console.log('Starting Google ZkLogin authentication...');
      console.log('Has cached data:', hasCachedData);

      // Note: No need to clear cache here - getCachedZkLoginData will handle it if needed
      const data = await getCachedZkLoginData();
      console.log('ZkLogin data received:', {
        hasIdToken: !!data.idToken,
        hasUserSalt: !!data.userSalt,
        hasAddress: !!data.address,
        hasZkProof: !!data.zkProof,
      });

      if (data.idToken && data.userSalt && data.address && data.zkProof) {
        setZkLoginData({ ...data, provider: 'google' });
        setIsOpenSetAccountNameBottomSheet(true);
      } else {
        console.error('ZkLogin data incomplete:', data);
        toastError(t('pages.account.add-wallet.entry.toastGoogleDataMissing'));
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('pages.account.add-wallet.entry.unknownError');
      toastError(t('pages.account.add-wallet.entry.toastGoogleAuthFailed', { message: errorMessage }));
    } finally {
      setGoogleLoading(false);
      // 清理定时器
      if (googleTimerRef.current) {
        clearInterval(googleTimerRef.current);
        googleTimerRef.current = null;
      }
    }
  };

  const handleAppleAuth = async () => {
    setAppleLoading(true);
    setAppleCountdown(5);

    // 启动倒计时
    appleTimerRef.current = setInterval(() => {
      setAppleCountdown((prev) => {
        if (prev <= 1) {
          if (appleTimerRef.current) {
            clearInterval(appleTimerRef.current);
            appleTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      console.log('Starting Apple ZkLogin authentication...');
      console.log('Has cached data:', hasCachedData);

      // Note: No need to clear cache here - getCachedAppleZkLoginData will handle it if needed
      const data = await getCachedAppleZkLoginData();
      console.log('Apple ZkLogin data received:', {
        hasIdToken: !!data.idToken,
        hasUserSalt: !!data.userSalt,
        hasAddress: !!data.address,
        hasZkProof: !!data.zkProof,
      });

      if (data.idToken && data.userSalt && data.address && data.zkProof) {
        setZkLoginData({ ...data, provider: 'apple' });
        setIsOpenSetAccountNameBottomSheet(true);
      } else {
        console.error('Apple ZkLogin data incomplete:', data);
        toastError(t('pages.account.add-wallet.entry.toastAppleDataMissing'));
      }
    } catch (error) {
      console.error('Apple authentication error:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('pages.account.add-wallet.entry.unknownError');
      toastError(t('pages.account.add-wallet.entry.toastAppleAuthFailed', { message: errorMessage }));
    } finally {
      setAppleLoading(false);
      // 清理定时器
      if (appleTimerRef.current) {
        clearInterval(appleTimerRef.current);
        appleTimerRef.current = null;
      }
    }
  };

  const setUpZkLoginAccount = async (newAccountName: string) => {
    try {
      if (isInitialSetup && !currentPassword) {
        toastError(t('pages.account.add-wallet.entry.toastPasswordMissing'));
        navigate({ to: Init.to });
        return;
      }

      // Check for duplicate ZkLogin account
      if (zkLoginData.address) {
        const existingAccount = userAccounts.find(
          account => account.type === 'ZKLOGIN' && account.address === zkLoginData.address,
        );

        if (existingAccount) {
          console.log('Duplicate ZkLogin account detected:', zkLoginData.address);
          const providerLabel =
            zkLoginData.provider === 'google'
              ? t('pages.account.add-wallet.entry.providers.google')
              : t('pages.account.add-wallet.entry.providers.apple');
          toastError(
            t('pages.account.add-wallet.entry.toastDuplicateZkLogin', {
              provider: providerLabel,
            }),
          );
          // Clean up temporary data
          clearZkLoginCache();
          setIsOpenSetAccountNameBottomSheet(false);
          return;
        }
      }

      // Validate all required ZkLogin data
      if (!zkLoginData.idToken || !zkLoginData.userSalt || !zkLoginData.address || !zkLoginData.provider) {
        toastError(t('pages.account.add-wallet.entry.toastDataIncomplete'));
        return;
      }

      if (!zkLoginData.zkProof) {
        toastError(t('pages.account.add-wallet.entry.toastProofMissing'));
        return;
      }

      if (!ephemeralKeyPair) {
        toastError(t('pages.account.add-wallet.entry.toastEphemeralMissing'));
        return;
      }

      if (!maxEpoch) {
        toastError(t('pages.account.add-wallet.entry.toastMaxEpochMissing'));
        return;
      }

      console.log('Creating ZkLogin account with:', {
        accountName: newAccountName,
        hasEphemeralKeyPair: !!ephemeralKeyPair,
        maxEpoch,
        hasZkProof: !!zkLoginData.zkProof,
      });

      setIsLoadingSetup(true);
      const accountId = uuidv4();

      // Get ephemeralKeyPair private key
      const ephemeralPrivateKey = ephemeralKeyPair.getSecretKey();
      console.log('Ephemeral private key length:', ephemeralPrivateKey.length);

      // Encrypt sensitive data
      const encryptedIdToken = aesEncrypt(zkLoginData.idToken, currentPassword!);
      const encryptedUserSalt = aesEncrypt(zkLoginData.userSalt, currentPassword!);
      const encryptedEphemeralKey = aesEncrypt(ephemeralPrivateKey, currentPassword!);
      const encryptedZkProof = aesEncrypt(JSON.stringify(zkLoginData.zkProof), currentPassword!);
      const encryptedRestoreString = sha512(zkLoginData.idToken + zkLoginData.userSalt);

      const newAccount: AccountWithName = {
        id: accountId,
        type: 'ZKLOGIN',
        name: newAccountName,
        encryptedIdToken,
        encryptedUserSalt,
        address: zkLoginData.address,
        encryptedEphemeralKey,
        encryptedZkProof,
        maxEpoch,
        encryptedRestoreString,
        provider: zkLoginData.provider!,
      } as AccountWithName & ZkLoginAccount;

      if (!comparisonPasswordHash) {
        const newComparisonPasswordHash = sha512(currentPassword!);
        await updateExtensionStorageStore('comparisonPasswordHash', newComparisonPasswordHash);
      }

      console.log('Saving ZkLogin account to storage...');
      await addAccountWithName(newAccount);
      await addPreferAccountType(newAccount.id);

      // 为 ZkLogin 账户生成标准地址数据
      const zkLoginAddress = {
        chainId: ZKLOGIN_SUPPORTED_CHAIN_ID,
        chainType: ZKLOGIN_SUPPORTED_CHAIN_TYPE,
        address: zkLoginData.address,
        publicKey: ephemeralKeyPair.getPublicKey().toSuiAddress(),
        accountType: ZKLOGIN_ACCOUNT_TYPE,
      };

      // 存储地址数据到标准位置
      await chrome.storage.local.set({
        [`${accountId}-address`]: [zkLoginAddress],
      });
      console.log('ZkLogin address data saved to standard storage');

      // 等待账户数据同步到存储，验证账户是否已正确保存
      let retryCount = 0;
      const maxRetries = 5;
      let accountExists = false;

      while (retryCount < maxRetries && !accountExists) {
        try {
          const storedAccounts = await getExtensionLocalStorage('userAccounts');
          accountExists = !!(storedAccounts?.find((account) => account.id === accountId));

          if (!accountExists) {
            console.log(`Account not found in storage, retrying... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms
            retryCount++;
          }
        } catch (error) {
          console.error('Error checking account existence:', error);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!accountExists) {
        throw new Error('Failed to verify account was saved to storage after multiple retries');
      }

      console.log('Account verified in storage, setting as current...');
      await setCurrentAccount(newAccount.id);

      console.log('ZkLogin account created successfully:', accountId);
      toastSuccess(t('pages.account.add-wallet.entry.toastCreateSuccess', { name: newAccountName }));
      navigate({ to: Dashboard.to });
    } catch (error) {
      console.error('Failed to create ZkLogin account - detailed error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        zkLoginData: {
          hasIdToken: !!zkLoginData.idToken,
          hasUserSalt: !!zkLoginData.userSalt,
          hasAddress: !!zkLoginData.address,
          hasZkProof: !!zkLoginData.zkProof,
        },
        hasEphemeralKeyPair: !!ephemeralKeyPair,
        maxEpoch,
      });
      const errorMessage =
        error instanceof Error ? error.message : t('pages.account.add-wallet.entry.unknownError');
      toastError(t('pages.account.add-wallet.entry.toastCreateFailed', { message: errorMessage }));
    } finally {
      setIsLoadingSetup(false);
      setIsOpenSetAccountNameBottomSheet(false);
    }
  };

  return (
    <>
      <BaseBody>
        <Body>
          <img
            src={BgLeft}
            alt="HomeIcon"
            className="absolute top-[37px] left-0"
          />
          <img
            src={BgRight}
            alt="HomeIcon"
            className="absolute top-0 right-0"
          />
          <img
            src={HomeIcon}
            alt="HomeIcon"
            className="mx-auto"
          />
          <div
            className="mx-auto mt-[-2px] w-[240px] text-center text-[42px] leading-[46px] font-bold text-white"
          >{t('pages.account.initial.index.welcome')}</div>
          <div
            className="mt-[4px] h-[22px] text-center text-[18px] leading-[22px] opacity-60 text-white"
          >{t('pages.account.initial.index.slogan')}</div>
          <div className="my-[45px] flex justify-start flex-col">
            <LoginButton
              imageSrc={AddGreyIcon}
              title={t('pages.account.initial.index.createWallet')}
              onClick={() => {
                void navigate({ to: CreateMnemonic.to });
              }}
              disabled={googleLoading || appleLoading || isLoadingSetup}
            />
            <LoginButton
              imageSrc={ImportIcon}
              title={t('pages.account.initial.index.importWallet')}
              onClick={() => {
                void navigate({ to: RestoreWalletWithMnemonic.to });
              }}
              disabled={googleLoading || appleLoading || isLoadingSetup}
            />
            <LoginButton
              key={'google'}
              imageSrc={GoogleLogo}
              title={t('pages.account.initial.index.googleLogin')}
              disabled={googleLoading || appleLoading || isLoadingSetup}
              loading={googleLoading || isLoadingSetup}
              onClick={handleGoogleAuth}
              // loadingText={`${googleCountdown}s`}
            />
            <LoginButton
              key={'apple'}
              imageSrc={AppleLogo}
              title={t('pages.account.initial.index.appleLogin')}
              disabled={googleLoading || appleLoading || isLoadingSetup}
              loading={appleLoading || isLoadingSetup}
              onClick={handleAppleAuth}
              // loadingText={`${appleCountdown}s`}
            />
            {/*<div*/}
            {/*  className="w-[140px] cursor-pointer rounded-[16px] bg-[#0047C4] p-[20px]"*/}
            {/*onClick={() => {*/}
            {/*navigate({ to: CreateMnemonic.to });*/}
            {/*}}*/}
            {/*>*/}
            {/*  <div className="size-[36px] rounded-[40px] bg-white pt-[8px]">*/}
            {/*    <img*/}
            {/*      src={AddPrimaryIcon}*/}
            {/*      alt="create"*/}
            {/*      className="ml-[8px] size-[20px]"*/}
            {/*    />*/}
            {/*  </div>*/}
            {/*  <div*/}
            {/*    className="mt-[51px] w-[66px] text-[20px] leading-[23px] text-white"*/}
            {/*  >{t('pages.account.initial.index.createWallet')}</div>*/}
            {/*</div>*/}
            {/*<div*/}
            {/*  onClick={() => {*/}
            {/*    navigate({ to: RestoreWalletWithMnemonic.to });*/}
            {/*  }}*/}
            {/*  className="ml-[16px] w-[140px] cursor-pointer rounded-[16px] bg-[#1E2025] p-[20px]"*/}
            {/*>*/}
            {/*  <div className="size-[36px] rounded-[40px] bg-white pt-[8px]">*/}
            {/*    <img*/}
            {/*      src={AddGreyIcon}*/}
            {/*      alt="import"*/}
            {/*      className="ml-[8px] size-[20px]"*/}
            {/*    />*/}
            {/*  </div>*/}
            {/*  <div*/}
            {/*    className="mt-[51px] w-[66px] text-[20px] leading-[23px] font-bold text-white"*/}
            {/*  >{t('pages.account.initial.index.importWallet')}</div>*/}
            {/*</div>*/}
            {/*<div*/}
            {/*  onClick={() => {*/}
            {/*    navigate({ to: RestoreWalletWithMnemonic.to });*/}
            {/*  }}*/}
            {/*  className="ml-[16px] w-[140px] cursor-pointer rounded-[16px] bg-[#1E2025] p-[20px]"*/}
            {/*>*/}
            {/*  <div className="size-[36px] rounded-[40px] bg-white pt-[8px]">*/}
            {/*    <img*/}
            {/*      className="ml-[8px] size-[20px] mr-[8px]"*/}
            {/*      src={GoogleLogo}*/}
            {/*      width="20px"*/}
            {/*      alt="Google"*/}
            {/*    />*/}
            {/*  </div>*/}
            {/*  <div*/}
            {/*    className="mt-[51px] w-[66px] text-[20px] leading-[23px] font-bold text-white"*/}
            {/*  >{t('pages.account.initial.index.googleLogin')}</div>*/}
            {/*</div>*/}
          </div>
          {/*<InformationPanel*/}
          {/*  varitant="info"*/}
          {/*  title={<Typography variant="b3_M">{t('pages.account.add-wallet.index.infoTitle')}</Typography>}*/}
          {/*  body={<Typography variant="b4_R_Multiline">{t('pages.account.add-wallet.index.infoBody')}</Typography>}*/}
          {/*/>*/}

          {/*<EdgeAligner>*/}
          {/*  <OptionButtonsContainer>*/}
          {/*    <OptionButton*/}
          {/*      onClick={() =>*/}
          {/*        navigate({*/}
          {/*          to: CreateMnemonic.to,*/}
          {/*        })*/}
          {/*      }*/}
          {/*      icon={<CreateWalletIcon />}*/}
          {/*      titleText={t('pages.account.add-wallet.index.createNewWallet')}*/}
          {/*      bodyText={t('pages.account.add-wallet.index.createNewWalletDescription')}*/}
          {/*    />*/}
          {/*    <OptionButton*/}
          {/*      onClick={() =>*/}
          {/*        navigate({*/}
          {/*          to: RestoreWalletWithMnemonic.to,*/}
          {/*        })*/}
          {/*      }*/}
          {/*      icon={<MnemonicWalletIcon />}*/}
          {/*      titleText={t('pages.account.add-wallet.index.restoreWithMnemonic')}*/}
          {/*      bodyText={t('pages.account.add-wallet.index.restoreWithMnemonicDescription')}*/}
          {/*    />*/}
          {/*    <OptionButton*/}
          {/*      onClick={() =>*/}
          {/*        navigate({*/}
          {/*          to: RestoreWalletWithPrivateKey.to,*/}
          {/*        })*/}
          {/*      }*/}
          {/*      icon={<PrivateKeyWalletIcon />}*/}
          {/*      titleText={t('pages.account.add-wallet.index.restoreWithPrivateKey')}*/}
          {/*      bodyText={t('pages.account.add-wallet.index.restoreWithPrivateKeyDescription')}*/}
          {/*    />*/}
          {/*  </OptionButtonsContainer>*/}
          {/*</EdgeAligner>*/}
        </Body>
      </BaseBody>
      <BaseFooter>
        <FooterContainer
          style={{
            display: 'none',
          }}
        >
          <DescriptionText variant="b3_R">{t('pages.account.add-wallet.index.guide')}</DescriptionText>
          <TextButton variant="hyperlink">{t('pages.account.add-wallet.index.goToGuide')}</TextButton>
        </FooterContainer>
      </BaseFooter>
      <SetAccountNameBottomSheet
        open={isOpenSetAccountNameBottomSheet}
        onClose={() => {
          setIsOpenSetAccountNameBottomSheet(false);
          clearZkLoginCache();
        }}
        currentName={decodedJwt?.email ?? ''} //Google 邮箱作为默认账户名
        setName={(accountName) => {
          void setUpZkLoginAccount(accountName);
        }}
      />
    </>
  );
}
