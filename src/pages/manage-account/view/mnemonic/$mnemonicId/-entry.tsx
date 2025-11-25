import { useTranslation } from 'react-i18next';

import BaseBody from '@/components/BaseLayout/components/BaseBody';
import MnemonicViewer from '@/components/MnemonicViewer';
import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { useClipboard } from '@/hooks/useClipboard';
import { aesDecrypt } from '@/utils/crypto';
import { useExtensionStorageStore } from '@/zustand/hooks/useExtensionStorageStore';

import { Body, DescriptionContainer, DescriptionSubTitle, DescriptionTitle, MnemonicViewerContainer, MnemonicExplain } from './-styled';
import { useState } from 'react';
import EyeOffIcon from '@/assets/images/icons/EyeOff20.svg';

type EntryProps = {
  mnemonicId: string;
};

export default function Entry({ mnemonicId }: EntryProps) {
  const { t } = useTranslation();
  const { currentPassword } = useCurrentPassword();
  const { copyToClipboard } = useClipboard();

  const [showPhrase, setShowPhrase] = useState(false);
  const { userAccounts } = useExtensionStorageStore((state) => state);
  const account = userAccounts.find((item) => item.encryptedRestoreString === mnemonicId);

  const encryptedMnemonic = account?.type === 'MNEMONIC' ? account.encryptedMnemonic : '';
  const decryptedMnemonic = currentPassword ? aesDecrypt(encryptedMnemonic, currentPassword) : '';

  return (
    <>
      <BaseBody>
        <Body>
          <DescriptionContainer>
            <DescriptionTitle variant="h2_B">{t('pages.manage-account.view.mnemonic.entry.title')}</DescriptionTitle>
            <DescriptionSubTitle variant="b3_R_Multiline">{t('pages.manage-account.view.mnemonic.entry.subTitle')}</DescriptionSubTitle>
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
    </>
  );
}
