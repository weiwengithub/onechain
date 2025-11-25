import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import IconTextButton from '../common/IconTextButton';
import Popover from '../common/Popover';

export const StyledPopover = styled(Popover)({
  display: 'flex',
  flexDirection: 'column',
});

export const StyledIconTextButton = styled(IconTextButton)(({ theme }) => ({
  width: '140px',
  height: '32px',
  padding: '0 8px',
  display: 'flex',
  alignItems: 'center',
  margin: '8px',
  cursor: 'pointer',

  '&:hover': {
    backgroundColor: '#3F4655',
    borderRadius: '8px',
    opacity: '1',
  },
}));

export const StyledTypography = styled(Typography)(({ theme }) => ({
  marginLeft: '8px',
  fontSize: '16px',
  color: '#FFFFFF',
}));
