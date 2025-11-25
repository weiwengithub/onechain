import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import OutlinedButton from '@/components/common/OutlinedButton';

type ContainerProps = {
  'data-is-dragging': boolean;
};

export const Container = styled('div')<ContainerProps>(() => ({
  width: '100%',

  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',

  paddingBottom: '12px',
  marginTop: '12px',
}));

export const TopButton = styled('button')(() => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '20px',
  marginTop: '12px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
}));

export const TopLeftContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
});

export const NotBackedUpText = styled(Typography)(({ theme }) => ({
  marginLeft: '0.4rem',
  color: theme.palette.accentColor.red400,
}));

export const TopRightContainer = styled('div')({});

export const BodyContainer = styled('div')({
  width: '100%',

  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

export const AccountButton = styled('button')(() => ({
  width: '100%',

  display: 'flex',
  alignItems: 'center',

  border: 'none',
  background: 'none',
  marginTop: '12px',
  cursor: 'pointer',
}));

export const AccountLeftContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  columnGap: '1rem',

  marginRight: 'auto',
});

export const AccountRightContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});

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

export const DeleteButtonContainer = styled('button')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  
  width: '2rem',
  height: '2rem',
  
  border: 'none',
  borderRadius: '0.4rem',
  background: theme.palette.color.base200,
  
  cursor: 'pointer',
  
  '&:hover': {
    backgroundColor: theme.palette.color.base300,
    rounded: '40px',
  },
}));

export const AddressText = styled('div')(({ theme }) => ({
  fontSize: '1.5rem',
  color: theme.palette.color.base1300,
  lineHeight: '1rem',
}));