import { styled } from '@mui/material/styles';

import Base1300Text from '@/components/common/Base1300Text';
import Image from '@/components/common/Image';

export const Container = styled('div')({
  width: '100%',
});

export const StickyContainer = styled('div')(({ theme }) => ({
  width: '100%',
  height: 'fit-content',
  position: 'sticky',
  top: '3rem',

  padding: '1.6rem 1.2rem 2ren',

  boxSizing: 'border-box',

  zIndex: 1,
}));

export const AppContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  margin: '1.6rem 0 1rem',
});

export const AppIconImageContainer = styled(Image)({
  width: '5.2rem',
  height: '5.2rem',
  marginBottom: '1rem',
});

export const AppVersionText = styled(Base1300Text)({
  marginBottom: '0.4rem',
});

export const ButtonContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  paddingTop: '24px',
  marginTop: '24px',
  position: 'relative',

  '&::after': {
    content: '""',
    display: 'block',
    height: '1px',
    background: 'linear-gradient(90deg, #121315 0%, #2C3039 51.32%, #121315 100%)',
    position: 'absolute',
    left: '-24px',
    right: '-24px',
    top: 0,
  }
});

export const ButtonIconContainer = styled('div')({
  width: '2.8rem',
  height: '2.8rem',

  '& > svg': {
    width: '100%',
    height: '100%',
  },
});
