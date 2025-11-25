import { useTranslation } from 'react-i18next';
import type { DialogProps } from '@mui/material';
import { Typography } from '@mui/material';

import { Body, Container, ContentsContainer, Header, HeaderTitle, JsonContainer, StyledButton, StyledDialog } from './styled';
import Base1000Text from '../common/Base1000Text';
import CopyButton from '../CopyButton';

import Close24Icon from 'assets/images/icons/Close24.svg';
import WarningIcon from '@/assets/img/icon/warning_32.png';

type ConfirmDialogProps = Omit<DialogProps, 'children'> & {
  title: string;
  descriptionText: string;
  onClickConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
};

export default function ConfirmDialog({ title, descriptionText, cancelText, confirmText, onClose, onClickConfirm, ...remainder }: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <StyledDialog
      {...remainder}
      onClose={onClose}
    >
      <Container>
        <Body>
          <ContentsContainer>
            <img
              src={WarningIcon}
              alt="warning"
              className="size-[32px]"
            />
            <div className="mt-[12px] leading-[24px] text-[20px] text-white font-bold text-center">{title}</div>
            <div className="mt-[16px] leading-[20px] text-[14px] text-white text-center">{descriptionText}</div>
            <div className="mt-[24px] w-full flex justify-between">
              <div
                className="w-[92px] h-[50px] rounded-[12px] bg-[#2b2e35] leading-[50px] text-[16px] text-white font-bold text-center hover:bg-[#4e545f]"
                onClick={() => {
                  onClose?.({}, 'backdropClick');
                }}
              >
                {cancelText || 'Cancel'}
              </div>
              <div
                className="w-[129px] h-[50px] rounded-[12px] bg-[#2247c4] leading-[50px] text-[16px] text-white font-bold text-center hover:bg-[#3b82ff]"
                onClick={onClickConfirm}
              >
                {confirmText || 'Confirm'}
              </div>
            </div>
          </ContentsContainer>
        </Body>
      </Container>
    </StyledDialog>
  );
}
