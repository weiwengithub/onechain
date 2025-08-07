import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import OutlinedButton from '@/components/common/OutlinedButton';

export const Container = styled('div')(() => ({
  width: '100%',

  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  paddingBottom: '12px',
  marginTop: '12px',
}));

export const TopContainer = styled('div')({
  width: '100%',
});

export const TopLeftContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',

  columnGap: '0.4rem',
});

export const TopRightContainer = styled('div')({});

export const Red400Text = styled(Typography)(({ theme }) => ({
  marginLeft: '0.4rem',
  color: theme.palette.accentColor.red400,
}));

export const PlusIconContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',

  color: theme.palette.color.base1000,
}));

export const BodyContainer = styled('div')({
  width: '100%',

  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

export const AccountButton = styled('button')(() => ({
  width: '100%',
  height: '46px',
  display: 'flex',
  alignItems: 'center',
  border: 'none',
  borderRadius: '12px',
  backgroundColor: '#1E2025',
  cursor: 'pointer',
  paddingLeft: '12px',
  marginTop: '12px',
}));

export const AddAccountButton = styled('div')({
  width: '100%',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #2C3039',
  borderRadius: '8px',
  marginTop: '12px',
});

export const AccountRightContainer = styled('div')({});

export const AccountImgContainer = styled('div')({
  width: '2.8rem',
  height: '2.8rem',
});

export const AccountInfoContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',

  rowGap: '0.3rem',
});

export const LastHdPathTextContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
});

export const LastHdPathText = styled(Typography)(({ theme }) => ({
  color: theme.palette.color.base1000,
}));

export const LastHdPathIndexText = styled('div')(({ theme }) => ({
  color: theme.palette.color.base1000,
}));

export const ActiveBadge = styled('div')(({ theme }) => ({
  width: '1.8rem',
  height: '1.8rem',

  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',

  borderRadius: '50%',

  background: theme.palette.accentColor.blue600,
}));

export const OutlinedButtonContainer = styled('div')({
  width: '100%',
  padding: '0.8rem 1.6rem 0',
  boxSizing: 'border-box',
});

export const StyledOutlinedButton = styled(OutlinedButton)({
  height: '3.2rem',
});

export const RightArrowIconContainer = styled('div')(({ theme }) => ({
  width: '1.2rem',
  height: '1.2rem',
  '& > svg': {
    width: '100%',
    height: '100%',
    fill: theme.palette.color.base800,
    '& > path': {
      fill: theme.palette.color.base800,
    },
  },
}));

export const EmptyAssetContainer = styled('div')({
  position: 'absolute',

  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
});
