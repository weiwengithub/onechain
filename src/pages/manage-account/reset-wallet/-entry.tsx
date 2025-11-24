import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Base1300Text from '@/components/common/Base1300Text';
import Button from '@/components/common/Button';
import { Route as Initial } from '@/pages/account/initial';
import { toastSuccess } from '@/utils/toast';
import { useExtensionSessionStorageStore } from '@/zustand/hooks/useExtensionSessionStorageStore';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';
import ForgetPasswordIcon from "@/assets/images/icons/ForgetPassword.svg"

import ResetBottomSheet from './-components/ResetBottomSheet';
import {
  Body,
  CheckBoxContainer,
  CheckBoxTextContainer,
  DescriptionContainer,
  DescriptionSubTitle,
  DescriptionTitle,
  StyledCheckBoxContainer,
  StyledInputContainer,
  StyledInput
} from './-styled';
import { type ResetForm, useSchema } from '@/pages/manage-account/reset-wallet/-components/ResetBottomSheet/useSchema.ts';
import { useForm } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import StandardInput from '@components/common/StandardInput';
import { InputAdornment } from '@mui/material';
import { StyledIconButton } from '@components/common/StandardInput/styled.tsx';
import ViewIcon from '@/assets/images/icons/View12.svg';
import ViewHideIcon from '@/assets/images/icons/ViewHide20.svg';

export default function Entry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { resetExtensionStorageStore } = useExtensionStorageStore((state) => state);
  const { resetExtensionSessionStorageStore } = useExtensionSessionStorageStore((state) => state);

  const [isCheckTerms, setIsCheckTerms] = useState([false, false, false]);

  const [isOpenResetBottomSheet, setIsOpenResetBottomSheet] = useState(false);

  const [isConfirm, setIsConfirm] = useState(false);

  const handleCheck = (index: number) => {
    setIsCheckTerms((prev) => {
      const newCheckTerms = [...prev];
      newCheckTerms[index] = !newCheckTerms[index];
      return newCheckTerms;
    });
  };

  const [resetText, setResetText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isButtonDisabled = isConfirm && !resetText;

  const handleSubmit = () => {
    resetExtensionStorageStore();
    resetExtensionSessionStorageStore();
    toastSuccess(t('pages.manage-account.reset-wallet.entry.resetSuccess'));

    navigate({
      to: Initial.to,
    });
  };


  return (
    <>
      <BaseBody>
        <Body>
          {isConfirm ? (
            <>
              <div className="leading-[40px] text-[36px] text-white font-bold">{t('pages.manage-account.reset-wallet.entry.title2')}</div>
              <div className="mt-[16px] leading-[19px] text-[16px] text-white opacity-60">{t('pages.manage-account.reset-wallet.entry.subTitle2')}</div>
              <div className="mt-[24px] leading-[19px] text-[16px] text-white font-bold">{t('pages.manage-account.reset-wallet.entry.resetOneWallet')}</div>
              <div className="mt-[8px] leading-[19px] text-[16px] text-white opacity-60">{t('pages.manage-account.reset-wallet.entry.description5')}</div>
              <StyledInputContainer className="mt-[16px]">
                <StyledInput
                  placeholder={t('pages.manage-account.reset-wallet.components.ResetBottomSheet.index.inputLabel')}
                  type="text"
                  hideViewIcon={true}
                  value={resetText}
                  onChange={e => {
                    setResetText(e.target.value)
                    setErrorMessage('')
                  }}
                  error={!!errorMessage}
                  helperText={errorMessage}
                />
              </StyledInputContainer>
            </>
            ) : (
            <>
              <div className="flex justify-center">
                <ForgetPasswordIcon />
              </div>
              <div className="mt-[16px] leading-[24px] text-[24px] text-white font-bold text-center">{t('pages.manage-account.reset-wallet.entry.title1')}</div>
              <div className="mt-[16px] leading-[18px] text-[14px] text-white text-center opacity-70">{t('pages.manage-account.reset-wallet.entry.subTitle1')}</div>
              <div className="mt-[16px] leading-[18px] text-[14px] text-white text-center opacity-70 px-[12px]">{t('pages.manage-account.reset-wallet.entry.description4')}</div>
            </>
          )}
        </Body>
      </BaseBody>
      <BaseFooter>
        <Button
          onClick={() => {
            if (isConfirm) {
              if (resetText !== 'RESET') {
                setErrorMessage(t('schema.resetForm.reset.any.only'));
                return;
              }
              handleSubmit()
            } else {
              setIsConfirm(true)
            }
          }}
          variant = 'red'
          disabled={isButtonDisabled}
        >
          {t('pages.manage-account.reset-wallet.entry.resetOneWallet')}
        </Button>
      </BaseFooter>
    </>
  );
}
