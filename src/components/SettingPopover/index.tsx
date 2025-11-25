import { useTranslation } from 'react-i18next';
import { type PopoverProps } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

import { useCurrentPassword } from '@/hooks/useCurrentPassword';
import { Route as GeneralSetting } from '@/pages/general-setting';
import { Route as ManageDapps } from '@/pages/manage-dapps';

import { StyledIconTextButton, StyledPopover, StyledTypography } from './styled';

import LockIcon from 'assets/images/icons/Lock18.svg';
import DappIcon from 'assets/images/icons/OutlinedManageDapp16.svg';
import SettingIcon from 'assets/images/icons/Setting20.svg';

type SettingPopoverProps = Omit<PopoverProps, 'children'>;

export default function SettingPopover({ onClose, ...remainder }: SettingPopoverProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setCurrentPassword } = useCurrentPassword();
  const tempDisplay = false;
  return (
    <StyledPopover {...remainder} onClose={onClose}>
      <StyledIconTextButton
        onClick={() => {
          navigate({
            to: GeneralSetting.to,
          });
        }}
        leadingIcon={<SettingIcon />}
      >
        <StyledTypography variant="b3_M">{t('components.SettingPopover.index.setting')}</StyledTypography>
      </StyledIconTextButton>
      {tempDisplay && (
        <StyledIconTextButton
          onClick={() => {
            navigate({
              to: ManageDapps.to,
            });
          }}
          leadingIcon={<DappIcon />}
        >
          <StyledTypography variant="b3_M">{t('components.SettingPopover.index.manageDapps')}</StyledTypography>
        </StyledIconTextButton>
      )}
      <StyledIconTextButton
        onClick={() => {
          setCurrentPassword('');
        }}
        leadingIcon={<LockIcon />}
      >
        <StyledTypography variant="b3_M">{t('components.SettingPopover.index.lockWallet')}</StyledTypography>
      </StyledIconTextButton>
    </StyledPopover>
  );
}
