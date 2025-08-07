import { styled } from '@mui/material/styles';

import CheckBoxTextButton from '@/components/common/CheckBoxTextButton';

// import backgroundImg from '@/assets/images/backgroundImage/background.png';

export const Container = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  padding: '0 24px',
  boxSizing: 'border-box',

  // backgroundImage: `url(${backgroundImg})`,
  backgroundSize: 'auto',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundColor: '#101011',

  overflow: 'hidden',
  position: 'relative',
  justifyContent: 'center',
  alignItems: 'center',
});

export const TermsContainer = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  marginBottom: '2.4rem',
});

export const StyledCheckBoxTextButton = styled(CheckBoxTextButton)(({ theme }) => ({
  color: theme.palette.color.base1300,
}));

export const Body = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',

  height: '100%',
});
