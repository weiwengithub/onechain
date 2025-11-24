import { styled } from '@mui/material/styles';

export const Container = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  paddingBottom: '25px',

  '&::after': {
    content: '""',
    display: 'block',
    height: '1px',
    background: '#2C3039',
    position: 'absolute',
    left: '-24px',
    right: '-24px',
    bottom: 0,
  }
});

export const TopContainer = styled('div')({});
export const BodyContainer = styled('div')({});
