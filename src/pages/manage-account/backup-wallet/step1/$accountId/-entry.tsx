import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import BaseFooter from '@/components/BaseLayout/components/BaseFooter';
import Button from '@/components/common/Button';
import MnemonicViewer from '@/components/MnemonicViewer';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { useClipboard } from '@/hooks/useClipboard';
import { Route as ManageBackupStep2 } from '@/pages/manage-account/backup-wallet/step2/$accountId';
import { aesDecrypt } from '@/utils/crypto';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import { Body, DescriptionContainer, DescriptionSubTitle, DescriptionTitle, MnemonicViewerContainer, MnemonicExplain } from './-styled';
import { useState } from 'react';
import EyeOffIcon from '@/assets/images/icons/EyeOff20.svg';

type EntryProps = {
  accountId: string;
  isBackupCompleted?: boolean;
};

export default function Entry({ accountId, isBackupCompleted }: EntryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { copyToClipboard } = useClipboard();

  const { currentPassword } = useCurrentPassword();
  const [showPhrase, setShowPhrase] = useState(false);

  const { userAccounts } = useExtensionStorageStore((state) => state);
  const account = userAccounts.find((item) => item.id === accountId);

  const encryptedMnemonic = account?.type === 'MNEMONIC' ? account.encryptedMnemonic : '';
  const decryptedMnemonic = currentPassword ? aesDecrypt(encryptedMnemonic, currentPassword) : '';

  return (
    <>
      <BaseBody>
        <Body>
          <DescriptionContainer>
            <DescriptionTitle variant="h2_B">{t('pages.manage-account.backup-wallet.step1.entry.title')}</DescriptionTitle>
            <DescriptionSubTitle variant="b3_R_Multiline">{t('pages.manage-account.backup-wallet.step1.entry.subTitle')}</DescriptionSubTitle>
          </DescriptionContainer>

          <MnemonicViewerContainer>
            <MnemonicViewer rawMnemonic={decryptedMnemonic} variants="view" />
            {!showPhrase && (
              <div
                className="flex items-center justify-center w-full h-full absolute top-0 left-0 rounded-[12px] bg-[rgba(30,32,37,0.9)] backdrop-blur-[9px]"
                onClick={() => setShowPhrase(true)}
              >
                <EyeOffIcon />
              </div>
            )}
          </MnemonicViewerContainer>

          {showPhrase ? (
            <div
              className="mt-[24px] w-full h-[50px] bg-[#0047C4] rounded-[12px] text-center leading-[50px] text-white text-[16px] font-bold hover:bg-[#3B82FF] cursor-pointer"
              onClick={() => copyToClipboard(decryptedMnemonic)}
            >
              Copy to Clipboard
            </div>
          ) : (
            <MnemonicExplain>{t('pages.manage-account.backup-wallet.step1.entry.explain')}</MnemonicExplain>
          )}
        </Body>
      </BaseBody>
      <BaseFooter>
        <Button
          style={{
            display: isBackupCompleted ? 'none' : 'null',
          }}
          onClick={() => {
            navigate({
              to: ManageBackupStep2.to,
              params: {
                accountId: accountId,
              },
            });
          }}
        >
          {t('pages.manage-account.backup-wallet.step1.entry.continue')}
        </Button>
      </BaseFooter>
    </>
  );
}
